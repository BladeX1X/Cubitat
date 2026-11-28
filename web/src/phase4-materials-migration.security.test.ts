import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import migrationSql from '../supabase/dev-migrations/20261013140000_phase4_materials_marketplace.sql?raw'
import municipalityMigrationSql from '../supabase/migrations/20261128120000_material_municipality_coordinates_contract.sql?raw'

const productionMigrationWorkflow = readFileSync(
  resolve(process.cwd(), '../.github/workflows/apply-publication-coordinates-production.yml'),
  'utf8',
)

describe('F4-MAT migration security contract', () => {
  it('keeps the selected municipality in owner reads, edits and map coordinates', () => {
    expect(municipalityMigrationSql).toMatch(/RETURNS TABLE \([\s\S]*province text, municipality text,[\s\S]*coordinates jsonb/i)
    expect(municipalityMigrationSql).toMatch(/p_province text, p_municipality text,[\s\S]*p_coordinates jsonb/i)
    expect(municipalityMigrationSql).toMatch(/municipality = nullif\(btrim\(p_municipality\), ''\)/i)
    expect(municipalityMigrationSql).toMatch(/REVOKE ALL ON FUNCTION public\.update_material_listing\([\s\S]*FROM PUBLIC, anon/i)
    expect(municipalityMigrationSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.update_material_listing\([\s\S]*TO authenticated/i)
  })

  it('only applies the pinned municipality migration after exact production preflight, without a backup', () => {
    expect(productionMigrationWorkflow).toContain('APPLY PUBLICATION COORDINATES TO PRODUCTION WITHOUT BACKUP')
    expect(productionMigrationWorkflow).toContain('20261128120000_material_municipality_coordinates_contract.sql')
    expect(productionMigrationWorkflow).toContain('b8aa8b266b9524c2fac2a52c29f656b0f74a81a5c2e132ea7e5bc5a855179747')
    expect(productionMigrationWorkflow).toContain("[[ \"$(wc -l <<<\"$remote_versions\" | tr -d ' ')\" == '174' ]]")
    expect(productionMigrationWorkflow).toContain("[[ \"$(tail -n 1 <<<\"$remote_versions\")\" == '20261126120000' ]]")
    expect(productionMigrationWorkflow).toContain('[[ "$pending" == "$candidate" ]]')
    expect(productionMigrationWorkflow).toContain("[[ \"$versions\" == '20261128120000' ]]")
    expect(productionMigrationWorkflow).toContain("proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog']")
    expect(productionMigrationWorkflow).toContain("has_function_privilege('anon',owner_update,'EXECUTE')")
    expect(productionMigrationWorkflow).not.toContain('backup_run_id')
    expect(productionMigrationWorkflow).not.toContain('Supabase Backup')
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
