import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/dev-migrations/20261013150000_phase4_materials_private_storage.sql?raw'
import ownerUploadRepairSql from '../supabase/dev-migrations/20261114150000_phase4_material_owner_photo_upload.sql?raw'
import canonicalOwnerUploadRepairSql from '../supabase/migrations/20261114170000_fix_material_photo_storage_policy_privileges.sql?raw'

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

  it('restores owner uploads using the existing full-path validator without changing its signature', () => {
    expect(ownerUploadRepairSql).toMatch(/REVOKE ALL ON FUNCTION public\.can_upload_material_photo\(text\) FROM PUBLIC, anon/i)
    expect(ownerUploadRepairSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.can_upload_material_photo\(text\) TO authenticated/i)
    expect(ownerUploadRepairSql).toMatch(/material_photos_owner_upload[\s\S]*FOR INSERT TO authenticated[\s\S]*foldername\(name\)\)\[1\] = \(SELECT auth\.uid\(\)\)::text[\s\S]*can_upload_material_photo\(name\)/i)
    expect(ownerUploadRepairSql).not.toMatch(/CREATE OR REPLACE FUNCTION public\.can_upload_material_photo/i)
    expect(ownerUploadRepairSql).not.toMatch(/can_upload_material_photo\(\(storage\.foldername\(name\)\)\[2\]\)/i)
  })

  it('keeps the canonical repair aligned with the canonical listing-id helper and photo limit', () => {
    expect(canonicalOwnerUploadRepairSql).toMatch(/FUNCTION public\.can_upload_material_photo\(p_listing_id text\)[\s\S]*SECURITY DEFINER[\s\S]*listing\.id::text = p_listing_id[\s\S]*listing\.owner_id = \(SELECT auth\.uid\(\)\)/i)
    expect(canonicalOwnerUploadRepairSql).toMatch(/material_photos_owner_upload[\s\S]*can_upload_material_photo\(\(storage\.foldername\(name\)\)\[2\]\)[\s\S]*count_owned_material_photo_objects[\s\S]*\) < 20/i)
  })
})
