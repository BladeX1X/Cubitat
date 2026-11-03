import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./referrals/agentReferralRepository', () => ({ ensureAgentReferralCode: vi.fn() }))
vi.mock('./referrals/agentReferralVisitsRepository', () => ({ loadAgentReferralVisitCount: vi.fn() }))
vi.mock('./leads/agentLeadsRepository', () => ({ loadAgentLeads: vi.fn() }))
vi.mock('./commissions/agentCommissionsRepository', () => ({ loadAgentCommissions: vi.fn() }))
vi.mock('../referrals/agentAttributionRepository', () => ({ loadAgentAttributedContacts: vi.fn() }))

import { ensureAgentReferralCode } from './referrals/agentReferralRepository'
import { loadAgentReferralVisitCount } from './referrals/agentReferralVisitsRepository'
import { loadAgentLeads } from './leads/agentLeadsRepository'
import { loadAgentCommissions } from './commissions/agentCommissionsRepository'
import { loadAgentAttributedContacts } from '../referrals/agentAttributionRepository'
import { loadAgentGrowthDashboard } from './agentGrowthRepository'

describe('loadAgentGrowthDashboard', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(ensureAgentReferralCode).mockResolvedValue('AG-12AB34CD')
    vi.mocked(loadAgentLeads).mockResolvedValue({ leads: [], events: [] })
    vi.mocked(loadAgentCommissions).mockResolvedValue({ commissions: [], events: [] })
    vi.mocked(loadAgentAttributedContacts).mockResolvedValue([])
    vi.mocked(loadAgentReferralVisitCount).mockResolvedValue(0)
  })

  it('keeps referral and commission domains paused without calling their repositories', async () => {
    await expect(loadAgentGrowthDashboard()).resolves.toMatchObject({
      referralCode: null,
      leads: [],
      commissions: [],
      contacts: [],
      referralVisits: 0,
      commissionEvents: [],
      failedModules: [],
    })
    expect(ensureAgentReferralCode).not.toHaveBeenCalled()
    expect(loadAgentReferralVisitCount).not.toHaveBeenCalled()
    expect(loadAgentAttributedContacts).not.toHaveBeenCalled()
    expect(loadAgentCommissions).not.toHaveBeenCalled()
  })

  it('reports an opportunity read failure without failing deferred domains', async () => {
    vi.mocked(loadAgentLeads).mockRejectedValueOnce(new Error('agent_leads_load_failed'))
    await expect(loadAgentGrowthDashboard()).resolves.toMatchObject({
      referralCode: null,
      leads: [],
      failedModules: ['leads'],
      failureCodes: {},
    })
  })
})
