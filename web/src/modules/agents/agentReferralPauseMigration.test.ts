import { describe, expect, it } from 'vitest'
import productionSql from '../../../supabase/migrations/20261025020000_pause_unvalidated_agent_growth_rpcs.sql?raw'
import devSql from '../../../supabase/dev-migrations/20261025020000_pause_unvalidated_agent_growth_rpcs.sql?raw'

describe('paused agent growth RPC migration', () => {
  it('revokes execution from API roles while referral and commission policies are pending', () => {
    for (const sql of [productionSql, devSql]) {
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.ensure_agent_referral_link\(\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/i)
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.record_agent_commission\([\s\S]*FROM PUBLIC, anon, authenticated, service_role/i)
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.update_agent_commission_status\([\s\S]*FROM PUBLIC, anon, authenticated, service_role/i)
    }
  })

  it('also disables public visit writes and reads from the DEV-only migration track', () => {
    expect(devSql).toMatch(/REVOKE ALL ON FUNCTION public\.record_agent_referral_visit\(text, uuid\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/i)
    expect(devSql).toMatch(/REVOKE ALL ON FUNCTION public\.get_agent_referral_visit_count\(\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role/i)
    expect(productionSql).not.toContain('record_agent_referral_visit')
  })
})
