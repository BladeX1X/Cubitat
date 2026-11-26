import migrationSql from '../../../supabase/migrations/20261125110000_oauth_agent_signup_attribution.sql?raw'
import { describe, expect, it } from 'vitest'

describe('OAuth signup attribution migration', () => {
  it('permits only the new Google account to attribute its captured active agent code', () => {
    expect(migrationSql).toMatch(/FUNCTION public\.attribute_own_oauth_agent_signup\(\s*p_referral_code text\s*\)[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = pg_catalog/i)
    expect(migrationSql).toMatch(/auth\.uid\(\)[\s\S]*raw_app_meta_data->>'provider'[\s\S]*v_provider IS DISTINCT FROM 'google'/i)
    expect(migrationSql).toMatch(/created_at < statement_timestamp\(\) - interval '15 minutes'/i)
    expect(migrationSql).toMatch(/profile\.role = 'buyer'::public\.user_role/i)
    expect(migrationSql).toMatch(/link\.active[\s\S]*link\.agent_id <> v_user_id[\s\S]*agent\.verification_status = 'verified'/i)
    expect(migrationSql).toMatch(/ON CONFLICT \(referred_user_id\) DO NOTHING/i)
  })

  it('exposes the RPC only to authenticated sessions', () => {
    expect(migrationSql).toMatch(/REVOKE ALL ON FUNCTION public\.attribute_own_oauth_agent_signup\(text\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/i)
    expect(migrationSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.attribute_own_oauth_agent_signup\(text\)[\s\S]*TO authenticated/i)
  })
})
