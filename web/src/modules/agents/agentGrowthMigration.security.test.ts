import { describe, expect, it } from 'vitest'
import migrationSql from '../../../supabase/migrations/20261013130000_phase3_agent_growth.sql?raw'
import pauseSql from '../../../supabase/migrations/20261025020000_pause_unvalidated_agent_growth_rpcs.sql?raw'
import devPauseSql from '../../../supabase/dev-migrations/20261025020000_pause_unvalidated_agent_growth_rpcs.sql?raw'

describe('Phase 3 agent growth migration security contract', () => {
  it('keeps prospect, event, and commission data private to the owner or AAL2 admin', () => {
    for (const table of ['agent_leads', 'agent_lead_events', 'agent_commissions', 'agent_commission_events']) {
      expect(migrationSql).toContain(`REVOKE ALL ON TABLE public.${table} FROM PUBLIC, anon, authenticated`)
      expect(migrationSql).toMatch(new RegExp(`${table}[\\s\\S]*FOR SELECT TO authenticated USING[\\s\\S]*auth\\.uid\\(\\)[\\s\\S]*public\\.is_admin_aal2\\(\\)`, 'i'))
    }
    expect(migrationSql).toContain('GRANT SELECT ON TABLE public.agent_leads TO authenticated')
    expect(migrationSql).not.toContain('GRANT INSERT ON TABLE public.agent_leads TO authenticated')
  })

  it('requires an authenticated verified agent or admin for codes and lead creation', () => {
    expect(migrationSql).toMatch(/FUNCTION public\.ensure_agent_referral_link\(\)[\s\S]*auth\.uid\(\)[\s\S]*role IN \('agent'::public\.user_role, 'admin'::public\.user_role\)[\s\S]*verification_status = 'verified'/i)
    expect(migrationSql).toMatch(/agent_referral_links \([\s\S]*agent_id uuid NOT NULL UNIQUE[\s\S]*code text NOT NULL UNIQUE/i)
    expect(migrationSql).toMatch(/ON CONFLICT \(agent_id\) DO UPDATE[\s\S]*RETURNING code INTO v_code/i)
    expect(migrationSql).toMatch(/FUNCTION public\.create_agent_lead\([\s\S]*auth\.uid\(\)[\s\S]*role IN \('agent'::public\.user_role, 'admin'::public\.user_role\)[\s\S]*verification_status = 'verified'[\s\S]*p_consent_confirmed IS DISTINCT FROM true/i)
  })

  it('restricts commission changes to admins in AAL2 and calculates the amount in SQL', () => {
    expect(migrationSql).toMatch(/FUNCTION public\.record_agent_commission\([\s\S]*public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toMatch(/FUNCTION public\.update_agent_commission_status\([\s\S]*public\.is_admin_aal2\(\)/i)
    expect(migrationSql).toContain('GENERATED ALWAYS AS')
    expect(migrationSql).toContain('round(eligible_amount * rate_percent / 100, 2)')
    expect(migrationSql).toContain("IF p_status = 'void' AND p_note IS NULL")
    expect(migrationSql).toContain("IF p_status = 'paid' AND p_payment_reference IS NULL")
  })

  it('resolves referral codes in the trusted contact RPC and rejects self attribution', () => {
    expect(migrationSql).toMatch(/submit_public_contact_trusted\([\s\S]*p_referral_code text[\s\S]*p_contact_user_id uuid/i)
    expect(migrationSql).toContain("AND (p_contact_user_id IS NULL OR p_contact_user_id <> link.agent_id)")
    expect(migrationSql).toContain("CASE WHEN v_referral_code IS NULL THEN 'detail' ELSE 'agent_referral' END")
    expect(migrationSql).toContain('TO service_role')
    expect(migrationSql).toMatch(/agent\.role IN \('agent'::public\.user_role, 'admin'::public\.user_role\)[\s\S]*agent\.verification_status = 'verified'/i)
    expect(migrationSql).toMatch(/CREATE POLICY "Allow read for owners admins and attributed agents"[\s\S]*public\.is_admin_aal2\(\)/i)
    expect(migrationSql).not.toMatch(/CREATE POLICY "Allow read for owners admins and attributed agents"[\s\S]*public\.is_admin\(\)/i)
  })

  it('enforces the referral and commission pause through database privileges', () => {
    for (const sql of [pauseSql, devPauseSql]) {
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.ensure_agent_referral_link\(\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/i)
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.record_agent_commission\([\s\S]*FROM PUBLIC, anon, authenticated, service_role/i)
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.update_agent_commission_status\([\s\S]*FROM PUBLIC, anon, authenticated, service_role/i)
    }
    expect(devPauseSql).toMatch(/REVOKE ALL ON FUNCTION public\.record_agent_referral_visit\(text, uuid\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/i)
    expect(devPauseSql).toMatch(/REVOKE ALL ON FUNCTION public\.get_agent_referral_visit_count\(\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/i)
  })
})
