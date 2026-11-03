import { describe, expect, it } from 'vitest'
import migrationSql from '../../../supabase/migrations/20261028193000_preserve_agent_referral_link_pause.sql?raw'
import devMigrationSql from '../../../supabase/dev-migrations/20261028193000_preserve_agent_referral_link_pause.sql?raw'

describe('agent referral paused-link hardening migration', () => {
  it('keeps standard and DEV migration tracks aligned', () => {
    expect(devMigrationSql).toBe(migrationSql)
  })

  it('preserves an administratively paused link and never uses a conflict update', () => {
    expect(migrationSql).toMatch(/CREATE OR REPLACE FUNCTION public\.ensure_agent_referral_link\(\)[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = pg_catalog/i)
    expect(migrationSql).toMatch(/SELECT code, active INTO v_code, v_active[\s\S]*FROM public\.agent_referral_links[\s\S]*agent_id = v_agent_id/i)
    expect(migrationSql).toMatch(/IF FOUND THEN[\s\S]*IF NOT v_active THEN[\s\S]*ERRCODE = '42501'/i)
    expect(migrationSql).toMatch(/ON CONFLICT \(agent_id\) DO NOTHING[\s\S]*RETURNING code INTO v_code/i)
    expect(migrationSql).toMatch(/SELECT code, active INTO v_code, v_active[\s\S]*IF NOT FOUND OR NOT v_active THEN[\s\S]*ERRCODE = '42501'/i)
    expect(migrationSql).not.toMatch(/ON CONFLICT[\s\S]*DO UPDATE/i)
    expect(migrationSql).not.toMatch(/SET\s+active\s*=\s*true/i)
  })

  it('keeps referral provisioning paused for every API role', () => {
    expect(migrationSql).toMatch(/REVOKE ALL ON FUNCTION public\.ensure_agent_referral_link\(\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/i)
    expect(migrationSql).not.toMatch(/GRANT\s+EXECUTE\s+ON FUNCTION public\.ensure_agent_referral_link/i)
  })
})
