import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/dev-migrations/20260809000000_audit_log_retention.sql?raw'

describe('Auth audit log retention DEV migration', () => {
  it('stays outside production and fixes the retention cutoff at 90 days', () => {
    expect(migrationSql).toContain('DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT')
    expect(migrationSql).toMatch(/interval '90 days'/i)
    expect(migrationSql).toContain('FUNCTION public.preview_auth_audit_retention()')
    expect(migrationSql).not.toMatch(/p_retention_days/i)
  })

  it('returns only aggregate preview fields without audit payload or identifiers', () => {
    expect(migrationSql).toMatch(/RETURNS TABLE\s*\(\s*cutoff_at timestamptz,\s*eligible_count bigint,\s*oldest_eligible_at timestamptz,\s*newest_eligible_at timestamptz\s*\)/i)
    expect(migrationSql).not.toMatch(/RETURNS TABLE[\s\S]*\b(payload|ip_address|user_agent|audit_log_id)\b/i)
  })

  it('keeps purge dry-run by default, bounded and server-only', () => {
    expect(migrationSql).toMatch(/p_batch_size integer DEFAULT 500/i)
    expect(migrationSql).toMatch(/p_dry_run boolean DEFAULT true/i)
    expect(migrationSql).toMatch(/p_batch_size < 1 OR p_batch_size > 1000/i)
    expect(migrationSql).toMatch(/FOR UPDATE SKIP LOCKED/i)
    expect(migrationSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.preview_auth_audit_retention\(\)[\s\S]*?TO service_role/i)
    expect(migrationSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.purge_auth_audit_log_entries\(integer, boolean\)[\s\S]*?TO service_role/i)
    expect(migrationSql).toMatch(/REVOKE ALL ON FUNCTION public\.purge_auth_audit_log_entries\(integer, boolean\)[\s\S]*?FROM PUBLIC, anon, authenticated/i)
  })

  it('protects held time ranges and creates no automatic deletion path', () => {
    expect(migrationSql).toContain('CREATE TABLE public.auth_audit_retention_holds')
    expect(migrationSql).toContain('ENABLE ROW LEVEL SECURITY')
    expect(migrationSql).toMatch(/NOT EXISTS[\s\S]*public\.auth_audit_retention_holds/i)
    expect(migrationSql).not.toMatch(/cron\.schedule|pg_cron|scheduled/i)
    expect(migrationSql).not.toMatch(/SELECT\s+public\.purge_auth_audit_log_entries/i)
  })
})
