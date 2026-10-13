import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/migrations/20261013180000_temporary_admin_mfa_bypass.sql?raw'

describe('temporary admin MFA bypass migration', () => {
  it('activates one seven-day override at migration time without extending it on rerun', () => {
    expect(migrationSql).toMatch(/statement_timestamp\(\)\s*\+\s*interval\s+'7 days'/i)
    expect(migrationSql).toMatch(/ON CONFLICT\s*\(override_key\)\s*DO NOTHING/i)
  })

  it('keeps the exception admin-only, private, and automatically expiring', () => {
    expect(migrationSql).toMatch(/ALTER TABLE public\.admin_mfa_temporary_overrides ENABLE ROW LEVEL SECURITY/i)
    expect(migrationSql).toMatch(/REVOKE ALL ON TABLE public\.admin_mfa_temporary_overrides FROM PUBLIC, anon, authenticated, service_role/i)
    expect(migrationSql).toMatch(/FUNCTION public\.get_admin_mfa_bypass_until\(\)/i)
    expect(migrationSql).toMatch(/auth\.uid\(\) IS NOT NULL AND public\.is_admin\(\)/i)
    expect(migrationSql).toMatch(/public\.is_aal2\(\)\s+OR\s+public\.get_admin_mfa_bypass_until\(\) > statement_timestamp\(\)/i)
    expect(migrationSql).not.toMatch(/DROP.*FACTOR|UNENROLL|DELETE FROM auth\.mfa/i)
  })
})
