import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: { rpc },
}))

import { ensureAgentReferralCode, getAgentReferralLink } from './agentReferralRepository'

describe('agent referral module', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gets the code only from the server RPC and normalizes it', async () => {
    rpc.mockResolvedValue({ data: 'ag-12ab34cd', error: null })
    await expect(ensureAgentReferralCode()).resolves.toBe('AG-12AB34CD')
    expect(rpc).toHaveBeenCalledWith('ensure_agent_referral_link')
  })

  it('rejects RPC errors, missing data, and malformed codes', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: '42501' } })
    await expect(ensureAgentReferralCode()).rejects.toThrow('agent_referral_link_load_failed:42501')
    rpc.mockResolvedValueOnce({ data: null, error: null })
    await expect(ensureAgentReferralCode()).rejects.toThrow('agent_referral_link_load_failed:EMPTY_RESPONSE')
    rpc.mockResolvedValueOnce({ data: 'not-a-code', error: null })
    await expect(ensureAgentReferralCode()).rejects.toThrow('agent_referral_link_load_failed:INVALID_FORMAT')
  })

  it('builds a stable URL and refuses malformed codes', () => {
    expect(getAgentReferralLink('ag-12ab34cd', 'https://cubitat.example/'))
      .toBe('https://cubitat.example/?ref=AG-12AB34CD')
    expect(getAgentReferralLink('bad-code', 'https://cubitat.example')).toBeNull()
  })
})
