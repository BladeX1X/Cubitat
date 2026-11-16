import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/migrations/20261116110000_phase4_home_service_photo_storage.sql?raw'

describe('home service photo storage migration', () => {
  it('creates a private WebP bucket and validates each published gallery reference', () => {
    expect(migrationSql).toMatch(/VALUES \('home-service-photos', 'home-service-photos', false, 5242880, ARRAY\['image\/webp'\]/i)
    expect(migrationSql).toMatch(/FUNCTION public\.is_published_home_service_photo\(p_path text\)[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = pg_catalog/i)
    expect(migrationSql).toMatch(/provider\.status = 'published'[\s\S]*p_path = ANY\(provider\.gallery_urls\)/i)
    expect(migrationSql).toMatch(/FUNCTION public\.validate_home_service_gallery_references\(\)[\s\S]*cardinality\(coalesce\(NEW\.gallery_urls, '\{\}'\)\) > 10/i)
    expect(migrationSql).toMatch(/home_service_photo_object_missing/i)
  })

  it('limits uploads and owner reads while public reads use the SECURITY DEFINER gate', () => {
    expect(migrationSql).toMatch(/home_service_photos_owner_upload[\s\S]*FOR INSERT TO authenticated[\s\S]*foldername\(name\)\)\[1\] = \(SELECT auth\.uid\(\)\)::text[\s\S]*< 200/i)
    expect(migrationSql).toMatch(/home_service_photos_owner_read[\s\S]*FOR SELECT TO authenticated[\s\S]*foldername\(name\)\)\[1\] = \(SELECT auth\.uid\(\)\)::text/i)
    expect(migrationSql).toMatch(/home_service_photos_public_read[\s\S]*FOR SELECT TO anon, authenticated[\s\S]*public\.is_published_home_service_photo\(name\)/i)
    expect(migrationSql).toMatch(/home_service_photos_admin_aal2_read[\s\S]*public\.is_admin_aal2\(\)/i)
  })
})
