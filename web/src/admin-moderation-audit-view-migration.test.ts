import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/dev-migrations/20261115140000_restore_admin_moderation_audit_log.sql?raw'

describe('DEV admin moderation audit view migration', () => {
  it('restores the projection without replaying or backfilling source data', () => {
    expect(migrationSql).toMatch(/CREATE OR REPLACE VIEW public\.admin_moderation_audit_log\s+WITH \(security_invoker = true\)/i)
    expect(migrationSql).toContain('FROM public.property_moderation_audit AS audit')
    expect(migrationSql).toContain('FROM public.property_verification_audit AS audit')
    expect(migrationSql).not.toMatch(/INSERT INTO|UPDATE public\.|DELETE FROM/i)
  })

  it('exposes read-only SELECT to authenticated users and no access to anon', () => {
    expect(migrationSql).toMatch(/REVOKE ALL ON public\.admin_moderation_audit_log FROM PUBLIC, anon, authenticated/i)
    expect(migrationSql).toMatch(/GRANT SELECT ON public\.admin_moderation_audit_log TO authenticated/i)
    expect(migrationSql).toMatch(/REVOKE INSERT, UPDATE, DELETE[\s\S]*FROM PUBLIC, anon, authenticated, service_role/i)
  })
})
