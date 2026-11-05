import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/dev-migrations/20261013150000_phase4_materials_private_storage.sql?raw'

describe('F4-MAT private storage security contract', () => {
  it('creates a private bucket with server-enforced image limits', () => {
    expect(migrationSql).toMatch(/'material-listings', 'material-listings', false, 5242880/i)
    expect(migrationSql).toMatch(/ARRAY\['image\/webp', 'image\/jpeg', 'image\/png'\]/i)
  })

  it('limits uploads to the authenticated owner and an existing owned listing', () => {
    expect(migrationSql).toMatch(/material_photos_owner_upload[\s\S]*FOR INSERT TO authenticated[\s\S]*foldername\(name\)\)\[1\] = \(SELECT auth\.uid\(\)\)::text[\s\S]*listing\.owner_id = \(SELECT auth\.uid\(\)\)/i)
    expect(migrationSql).toMatch(/validate_material_photo_paths[\s\S]*storage\.objects[\s\S]*material_photo_object_missing/i)
    expect(migrationSql).toMatch(/FUNCTION public\.count_owned_material_photo_objects[\s\S]*SECURITY DEFINER[\s\S]*p_owner_id IS DISTINCT FROM \(SELECT auth\.uid\(\)\)/i)
    expect(migrationSql).toMatch(/count_owned_material_photo_objects\([\s\S]*\) < 20/i)
  })

  it('exposes objects only when referenced by a published active listing, or privately to its owner/admin AAL2', () => {
    expect(migrationSql).toMatch(/material_photos_public_read[\s\S]*FOR SELECT TO anon, authenticated[\s\S]*status = 'published'[\s\S]*availability <> 'out_of_stock'[\s\S]*name = ANY\(listing\.photo_urls\)/i)
    expect(migrationSql).toMatch(/material_photos_owner_read[\s\S]*listing\.owner_id = \(SELECT auth\.uid\(\)\)/i)
    expect(migrationSql).toMatch(/material_photos_admin_aal2_read[\s\S]*public\.is_admin_aal2\(\)/i)
    expect(migrationSql).not.toMatch(/'material-listings', 'material-listings', true/i)
  })

  it('does not allow owners to delete objects still referenced by a listing', () => {
    expect(migrationSql).toMatch(/material_photos_owner_delete_unreferenced[\s\S]*FOR DELETE TO authenticated[\s\S]*NOT EXISTS[\s\S]*name = ANY\(listing\.photo_urls\)/i)
  })
})
