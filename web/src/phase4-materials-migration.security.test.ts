import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/dev-migrations/20261013140000_phase4_materials_marketplace.sql?raw'
import municipalityMigrationSql from '../supabase/migrations/20261128120000_material_municipality_coordinates_contract.sql?raw'

describe('F4-MAT migration security contract', () => {
  it('keeps the selected municipality in owner reads, edits and map coordinates', () => {
    expect(municipalityMigrationSql).toMatch(/RETURNS TABLE \([\s\S]*province text, municipality text,[\s\S]*coordinates jsonb/i)
    expect(municipalityMigrationSql).toMatch(/p_province text, p_municipality text,[\s\S]*p_coordinates jsonb/i)
    expect(municipalityMigrationSql).toMatch(/municipality = nullif\(btrim\(p_municipality\), ''\)/i)
    expect(municipalityMigrationSql).toMatch(/REVOKE ALL ON FUNCTION public\.update_material_listing\([\s\S]*FROM PUBLIC, anon/i)
    expect(municipalityMigrationSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.update_material_listing\([\s\S]*TO authenticated/i)
  })

  it('limits public access to published in-stock listings and keeps inquiries private', () => {
    expect(migrationSql).toMatch(/material_listings_public_read[\s\S]*status = 'published' AND availability <> 'out_of_stock'/i)
    expect(migrationSql).toMatch(/material_inquiries_sender_read[\s\S]*sender_id = \(SELECT auth\.uid\(\)\)/i)
    expect(migrationSql).toMatch(/material_inquiries_owner_read[\s\S]*listing\.owner_id = \(SELECT auth\.uid\(\)\)/i)
    expect(migrationSql).toMatch(/GRANT SELECT \(id, slug, title, category[\s\S]*TO anon, authenticated/i)
    expect(migrationSql).not.toMatch(/GRANT SELECT ON public\.material_listings TO anon/i)
    expect(migrationSql).not.toMatch(/GRANT SELECT ON public\.material_inquiries TO anon/i)
  })

  it('creates only owner-pending listings and sends edits back through moderation', () => {
    expect(migrationSql).toMatch(/material_listings_owner_insert[\s\S]*owner_id = \(SELECT auth\.uid\(\)\) AND status = 'pending_review'/i)
    expect(migrationSql).toMatch(/FUNCTION public\.update_material_listing[\s\S]*listing\.owner_id = \(SELECT auth\.uid\(\)\)[\s\S]*status = 'pending_review'/i)
    expect(migrationSql).not.toMatch(/GRANT UPDATE ON public\.material_listings/i)
  })

  it('requires administrator AAL2 for moderation and records a reason and actor', () => {
    expect(migrationSql).toMatch(/FUNCTION public\.moderate_material_listing[\s\S]*IF NOT public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/material_moderation_audit[\s\S]*reason text[\s\S]*actor_id uuid/i)
    expect(migrationSql).not.toMatch(/CREATE TABLE(?: IF NOT EXISTS)? public\.(?:home_service_reviews|phase4_business_entitlements)/i)
  })
})
