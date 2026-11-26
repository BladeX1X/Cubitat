import migrationSql from '../../../supabase/migrations/20261125100000_agent_acquisition_metrics.sql?raw'
import { describe, expect, it } from 'vitest'

describe('agent acquisition metrics migration', () => {
  it('exposes only a verified agent’s aggregate referral signup count', () => {
    expect(migrationSql).toMatch(/FUNCTION public\.get_own_agent_acquisition_metrics\(\)[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = pg_catalog/i)
    expect(migrationSql).toMatch(/auth\.uid\(\)[\s\S]*role IN \('agent'::public\.user_role, 'admin'::public\.user_role\)[\s\S]*verification_status = 'verified'/i)
    expect(migrationSql).toMatch(/COUNT\(\*\)::bigint[\s\S]*FROM public\.agent_signup_attributions[\s\S]*agent_id = v_agent_id/i)
    expect(migrationSql).toMatch(/NULL::bigint[\s\S]*FALSE/i)
  })

  it('grants execution only to authenticated clients without exposing the ledger', () => {
    expect(migrationSql).toMatch(/REVOKE ALL ON FUNCTION public\.get_own_agent_acquisition_metrics\(\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/i)
    expect(migrationSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_own_agent_acquisition_metrics\(\)[\s\S]*TO authenticated/i)
    expect(migrationSql).not.toMatch(/GRANT\s+SELECT\s+ON\s+TABLE public\.agent_signup_attributions[\s\S]*TO authenticated/i)
  })
})
