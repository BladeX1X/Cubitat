import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/dev-migrations/20260801000000_phase2_kyc_and_agents.sql?raw'
import localApiGrantsSql from '../supabase/dev-migrations/20260801001000_local_api_grants.sql?raw'
import identitySelfieSql from '../supabase/dev-migrations/20260801002000_kyc_identity_selfie.sql?raw'

describe('Phase 2 security migration', () => {
  it('is isolated from the production migration chain', () => {
    expect(migrationSql).toContain('DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT')
  })
  it('protects verification fields and KYC moderation with admin AAL2', () => {
    expect(migrationSql).toMatch(/verification_status[\s\S]*is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/Admins gestionan solicitudes KYC[\s\S]*is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/review_kyc_request[\s\S]*IF NOT public\.is_admin_aal2\(\)/i)
  })

  it('uses a private bucket and stores an owner-scoped document path', () => {
    expect(migrationSql).toContain("'kyc_documents', 'kyc_documents', false")
    expect(migrationSql).toMatch(/document_path text NOT NULL/i)
    expect(migrationSql).toMatch(/p_document_path NOT LIKE v_user_id::text \|\| '\/%'/i)
    expect(migrationSql).not.toMatch(/document_url text NOT NULL/i)
  })

  it('exposes only a public-safe advertiser profile contract', () => {
    expect(migrationSql).toContain('FUNCTION public.get_public_agent_profile')
    expect(migrationSql).toContain('active_properties_count')
    expect(migrationSql).toContain('reports_count')
    expect(migrationSql).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_public_agent_profile\(UUID\) TO anon, authenticated/i)
  })

  it('queues email delivery without exposing a browser secret', () => {
    expect(migrationSql).toContain('email_delivery_status')
    expect(migrationSql).toContain("'pending'")
    expect(migrationSql).toContain('claim_pending_alert_emails')
    expect(migrationSql).toMatch(/FOR UPDATE SKIP LOCKED/i)
    expect(migrationSql).toMatch(/claim_pending_alert_emails\(integer\) TO service_role/i)
  })
})

describe('Phase 2 identity and selfie evidence', () => {
  it('stays isolated from production and requires two owner-scoped objects', () => {
    expect(identitySelfieSql).toContain('DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT')
    expect(identitySelfieSql).toMatch(/ADD COLUMN IF NOT EXISTS selfie_path text/i)
    expect(identitySelfieSql).toMatch(/p_document_path NOT LIKE v_user_id::text \|\| '\/document-%'/i)
    expect(identitySelfieSql).toMatch(/p_selfie_path NOT LIKE v_user_id::text \|\| '\/selfie-%'/i)
    expect(identitySelfieSql).toMatch(/p_selfie_path = p_document_path/i)
    expect(identitySelfieSql).toMatch(/submit_kyc_request\(text, text, text\) TO authenticated/i)
    expect(identitySelfieSql).toMatch(/status = 'pending' AND selfie_path IS NULL/i)
  })

  it('prevents approval when either private evidence object is missing', () => {
    expect(identitySelfieSql).toMatch(/p_status = 'approved'[\s\S]*v_selfie_path IS NULL/i)
    expect(identitySelfieSql).toMatch(/storage\.objects[\s\S]*name = v_document_path/i)
    expect(identitySelfieSql).toMatch(/storage\.objects[\s\S]*name = v_selfie_path/i)
  })
})

describe('Phase 2 local API grants', () => {
  it('keeps local reconstruction grants outside the production chain', () => {
    expect(localApiGrantsSql).toContain('DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT')
  })

  it('allows the authenticated UI operations that remain protected by RLS', () => {
    expect(localApiGrantsSql).toMatch(
      /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.properties TO authenticated/i,
    )
    expect(localApiGrantsSql).toMatch(
      /GRANT SELECT, INSERT, DELETE ON TABLE public\.saved_properties TO authenticated/i,
    )
    expect(localApiGrantsSql).toMatch(
      /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public\.search_alerts TO authenticated/i,
    )
    expect(localApiGrantsSql).toMatch(
      /GRANT SELECT, UPDATE ON TABLE public\.property_reports TO authenticated/i,
    )
  })
})
