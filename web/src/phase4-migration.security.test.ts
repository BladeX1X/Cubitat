import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/dev-migrations/20261013120000_phase4_home_services.sql?raw'

describe('F4-SVC migration security contract', () => {
  it('contains only service-directory tables and keeps public reads published-only', () => {
    expect(migrationSql).toMatch(/ALTER TABLE public\.home_service_providers ENABLE ROW LEVEL SECURITY/i)
    expect(migrationSql).toMatch(/home_service_providers_public_read[\s\S]*USING \(status = 'published'\)/i)
    expect(migrationSql).toMatch(/home_service_providers_owner_insert[\s\S]*owner_id = \(SELECT auth\.uid\(\)\)[\s\S]*status = 'pending_review'/i)
    expect(migrationSql).not.toMatch(/CREATE TABLE(?: IF NOT EXISTS)? public\.(?:material_listings|home_service_reviews|phase4_business_entitlements)/i)
  })

  it('does not grant public reads of ownership or private inquiries', () => {
    expect(migrationSql).toMatch(/GRANT SELECT \(id, slug, display_name[\s\S]*ON public\.home_service_providers TO anon, authenticated/i)
    expect(migrationSql).not.toMatch(/GRANT SELECT ON public\.home_service_providers TO anon/i)
    expect(migrationSql).toMatch(/REVOKE ALL ON TABLE[\s\S]*home_service_inquiries[\s\S]*FROM PUBLIC, anon, authenticated/i)
  })

  it('requires administrator AAL2 and records each service-profile decision', () => {
    expect(migrationSql).toMatch(/FUNCTION public\.moderate_home_service_provider\([\s\S]*IF NOT public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toContain("action IN ('approve', 'reject', 'pause')")
    expect(migrationSql).toMatch(/home_service_moderation_audit[\s\S]*reason text[\s\S]*actor_id uuid/i)
  })

  it('allows owners to update only their own unmoderated profiles through the RPC', () => {
    expect(migrationSql).toMatch(/FUNCTION public\.update_home_service_provider\([\s\S]*provider\.owner_id = \(SELECT auth\.uid\(\)\)[\s\S]*provider\.status IN \('pending_review', 'rejected', 'paused'\)/i)
    expect(migrationSql).not.toMatch(/GRANT UPDATE ON public\.home_service_providers/i)
  })

  it('keeps unrelated Fase 4 modules outside this migration', () => {
    expect(migrationSql).not.toMatch(/CREATE TABLE(?: IF NOT EXISTS)? public\.(?:material_listings|home_service_reviews|phase4_business_entitlements)/i)
  })
})
