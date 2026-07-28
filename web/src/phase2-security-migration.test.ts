import { describe, expect, it } from 'vitest'
import migrationSql from '../supabase/dev-migrations/20260801000000_phase2_kyc_and_agents.sql?raw'
import localApiGrantsSql from '../supabase/dev-migrations/20260801001000_local_api_grants.sql?raw'
import identitySelfieSql from '../supabase/dev-migrations/20260801002000_kyc_identity_selfie.sql?raw'
import agentKycGateSql from '../supabase/dev-migrations/20260801003000_require_verified_kyc_for_agent_role.sql?raw'
import verifiedAgentsAndMetricsSql from '../supabase/dev-migrations/20260801004000_verified_agents_and_contact_metrics.sql?raw'
import kycEvidenceRetentionSql from '../supabase/dev-migrations/20260801005000_kyc_evidence_retention.sql?raw'
import productionRoleSql from '../supabase/migrations/20260727100000_allow_self_role_toggle.sql?raw'

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

describe('Phase 2 agent role gate', () => {
  it('requires approved KYC and keeps the rule outside the production chain', () => {
    expect(agentKycGateSql).toContain('DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT')
    expect(agentKycGateSql).toMatch(/NEW\.role = 'agent'[\s\S]*NEW\.verification_status IS DISTINCT FROM 'verified'/i)
    expect(agentKycGateSql).toMatch(/NEW\.role := 'buyer'/i)
  })

  it('does not let a regular production user self-assign an agent role', () => {
    expect(productionRoleSql).toMatch(/OLD\.role IS DISTINCT FROM NEW\.role[\s\S]*NOT public\.is_admin_aal2\(\)/i)
    expect(productionRoleSql).not.toMatch(/auth\.uid\(\) = OLD\.id[\s\S]*NEW\.role IN/i)
  })
})

describe('Phase 2 verified agents and contact metrics', () => {
  it('publishes only verified agents and removes dismissed reports from the aggregate', () => {
    expect(verifiedAgentsAndMetricsSql).toContain('DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT')
    expect(verifiedAgentsAndMetricsSql).toMatch(/profiles\.role = 'agent'/i)
    expect(verifiedAgentsAndMetricsSql).toMatch(/profiles\.verification_status = 'verified'/i)
    expect(verifiedAgentsAndMetricsSql).toMatch(/reports\.status = 'resolved'/i)
  })

  it('deduplicates contact metrics per property, channel, visitor and day', () => {
    expect(verifiedAgentsAndMetricsSql).toMatch(/PRIMARY KEY \(property_id, channel, viewer_key, clicked_on\)/i)
    expect(verifiedAgentsAndMetricsSql).toMatch(/ON CONFLICT DO NOTHING/i)
    expect(verifiedAgentsAndMetricsSql).toMatch(/increment_contact_clicks\(uuid, text, uuid\) TO anon, authenticated/i)
    expect(verifiedAgentsAndMetricsSql).toMatch(/REVOKE ALL ON TABLE public\.property_contact_clicks/i)
  })
})

describe('Phase 2 KYC evidence retention', () => {
  it('keeps the retention migration isolated and schedules approved evidence for 24 hours', () => {
    expect(kycEvidenceRetentionSql).toContain(
      'DEV ONLY - NEVER APPLY TO THE PRODUCTION SUPABASE PROJECT',
    )
    expect(kycEvidenceRetentionSql).toMatch(/NEW\.evidence_purge_after := now\(\) \+ interval '24 hours'/i)
    expect(kycEvidenceRetentionSql).toMatch(/status = 'approved'[\s\S]*evidence_purge_after <= now\(\)/i)
  })

  it('reserves atomic claims and completion for service_role', () => {
    expect(kycEvidenceRetentionSql).toMatch(/FOR UPDATE SKIP LOCKED/i)
    expect(kycEvidenceRetentionSql).toMatch(
      /claim_approved_kyc_evidence_for_purge\(integer\)[\s\S]*TO service_role/i,
    )
    expect(kycEvidenceRetentionSql).toMatch(
      /complete_kyc_evidence_purge\(uuid\)[\s\S]*TO service_role/i,
    )
    expect(kycEvidenceRetentionSql).toMatch(
      /Las evidencias KYC siguen presentes en Storage/i,
    )
  })
})
