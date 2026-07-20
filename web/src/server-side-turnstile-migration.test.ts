import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/migrations/20260719002000_enforce_server_side_turnstile_submissions.sql?raw'

describe('server-side Turnstile submission migration', () => {
  it('removes direct public inserts for contacts and reports', () => {
    expect(migrationSql).toMatch(/DROP POLICY IF EXISTS "Allow validated contacts for published properties"/i)
    expect(migrationSql).toMatch(/REVOKE INSERT ON TABLE public\.contacts FROM PUBLIC, anon, authenticated/i)
    expect(migrationSql).toMatch(/DROP POLICY IF EXISTS "Anyone can insert a report"/i)
    expect(migrationSql).toMatch(/REVOKE INSERT ON TABLE public\.property_reports FROM PUBLIC, anon, authenticated/i)
  })

  it('exposes trusted submission functions only to service_role', () => {
    expect(migrationSql).toMatch(/submit_public_contact_trusted[\s\S]*SECURITY DEFINER[\s\S]*auth\.role\(\).*service_role/i)
    expect(migrationSql).toMatch(/submit_public_report_trusted[\s\S]*SECURITY DEFINER[\s\S]*auth\.role\(\).*service_role/i)
    expect(migrationSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.submit_public_contact_trusted[\s\S]*TO service_role/i)
    expect(migrationSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.submit_public_report_trusted[\s\S]*TO service_role/i)
  })
})
