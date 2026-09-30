import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/dev-migrations/20260810000000_property_verification_and_trust_score.sql?raw'

describe('Phase 2 property verification DEV migration', () => {
  it('keeps property evidence private and owner-scoped', () => {
    expect(migrationSql).toContain('-- DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT.')
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS public.property_verification_requests')
    expect(migrationSql).toContain("CREATE POLICY \"Property owners read own verification requests\"")
    expect(migrationSql).toContain("bucket_id = 'property_documents'")
    expect(migrationSql).toContain('property_id = p_property_id')
    expect(migrationSql).toContain('one_pending_property_verification_idx')
    expect(migrationSql).toContain("property.id::text = substring((storage.foldername(name))[2] FROM 10)")
  })

  it('requires AAL2 review and exposes only an internal explainable score', () => {
    expect(migrationSql).toContain('public.is_admin_aal2()')
    expect(migrationSql).toContain('review_property_verification')
    expect(migrationSql).toContain('get_property_trust_score')
    expect(migrationSql).toContain('internal_indicator')
    expect(migrationSql).toContain('legal_certification')
    expect(migrationSql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.get_property_trust_score\(uuid\).*TO anon/i)
  })
})
