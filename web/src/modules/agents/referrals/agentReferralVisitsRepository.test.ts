import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('../../../shared/lib/supabaseClient', () => ({ supabase: { rpc } }))

import { loadAgentReferralVisitCount, recordAgentReferralVisit } from './agentReferralVisitsRepository'

describe('agent referral visits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('records a valid visit once per browser session and referral code', async () => {
    rpc.mockResolvedValue({ data: true, error: null })
    await recordAgentReferralVisit('ag-12ab34cd')
    await recordAgentReferralVisit('AG-12AB34CD')
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('record_agent_referral_visit', expect.objectContaining({ p_code: 'AG-12AB34CD' }))
  })

  it('retries a visit if the first request fails', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error('offline') }).mockResolvedValueOnce({ data: true, error: null })
    await recordAgentReferralVisit('AG-12AB34CD')
    await recordAgentReferralVisit('AG-12AB34CD')
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('loads a safe non-negative visit count', async () => {
    rpc.mockResolvedValue({ data: 3, error: null })
    await expect(loadAgentReferralVisitCount()).resolves.toBe(3)
    rpc.mockResolvedValueOnce({ data: '3', error: null })
    await expect(loadAgentReferralVisitCount()).rejects.toThrow('agent_referral_visit_count_load_failed')
  })
})
