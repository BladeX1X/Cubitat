import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/dev-migrations/20261013160000_phase4_business_benefits.sql?raw'

describe('F4-BIZ migration security contract', () => {
  it('keeps grants and audit private behind AAL2 administrative RPCs', () => {
    expect(migrationSql).toMatch(/ALTER TABLE public\.business_benefits ENABLE ROW LEVEL SECURITY/i)
    expect(migrationSql).toMatch(/ALTER TABLE public\.business_benefit_audit ENABLE ROW LEVEL SECURITY/i)
    expect(migrationSql).toMatch(/REVOKE ALL ON public\.business_benefits, public\.business_benefit_audit FROM PUBLIC, anon, authenticated/i)
    expect(migrationSql).toMatch(/FUNCTION public\.grant_business_benefit[\s\S]*IF NOT public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/FUNCTION public\.revoke_business_benefit[\s\S]*IF NOT public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/business_benefit_audit[\s\S]*actor_id uuid[\s\S]*reason text/i)
    expect(migrationSql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.(?:grant_business_benefit|revoke_business_benefit)[^;]* TO anon/i)
  })

  it('publishes only active code and dates, and is independent of host tables', () => {
    expect(migrationSql).toMatch(/FUNCTION public\.get_active_business_benefits[\s\S]*RETURNS TABLE \(benefit_code text, starts_at timestamptz, expires_at timestamptz\)/i)
    expect(migrationSql).toMatch(/starts_at <= coalesce\(p_at, now\(\)\)[\s\S]*expires_at > coalesce\(p_at, now\(\)\)[\s\S]*revoked_at IS NULL/i)
    expect(migrationSql).toMatch(/p_target_type <> 'account' OR \(SELECT auth\.uid\(\)\) = p_target_id/i)
    expect(migrationSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_active_business_benefits[^;]* TO anon, authenticated/i)
    expect(migrationSql).not.toMatch(/REFERENCES public\.(?:home_service_providers|material_listings)/i)
    expect(migrationSql).not.toMatch(/CREATE TABLE[^;]*(?:payment|invoice|subscription_charge)/i)
  })
})
