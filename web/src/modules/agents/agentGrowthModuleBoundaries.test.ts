import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const source = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

describe('Phase 3 domain boundaries', () => {
  it('keeps leads independent from referral and commission persistence', () => {
    const leads = source('./leads/agentLeadsRepository.ts')
    expect(leads).not.toMatch(/from ['"].*(referrals|commissions)\//)
    expect(leads).not.toContain("from('agent_commissions')")
    expect(leads).not.toContain("from('agent_referral_links')")
  })

  it('keeps commissions independent from lead tables and referral state', () => {
    const commissions = source('./commissions/agentCommissionsRepository.ts')
    expect(commissions).not.toMatch(/from ['"].*(leads|referrals)\//)
    expect(commissions).not.toContain("from('agent_leads')")
    expect(commissions).not.toContain("from('agent_referral_links')")
  })

  it('keeps the agent dashboard as a composer rather than a table repository', () => {
    const dashboard = source('./agentGrowthRepository.ts')
    expect(dashboard).not.toContain('supabase.from(')
    expect(dashboard).toContain('loadAgentLeads()')
    expect(dashboard).not.toContain('ensureAgentReferralCode')
    expect(dashboard).not.toContain('loadAgentReferralVisitCount')
    expect(dashboard).not.toContain('loadAgentAttributedContacts')
    expect(dashboard).not.toContain('loadAgentCommissions()')
  })
})
