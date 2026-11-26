import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: { rpc, from },
}))

import { ensureAgentReferralCode, getAgentReferralLink, loadAgentReferralCode } from './agentReferralRepository'

describe('agent referral module', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads the active saved link without provisioning a code', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { code: 'ag-12ab34cd' }, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    from.mockReturnValue({ select })

    await expect(loadAgentReferralCode()).resolves.toBe('AG-12AB34CD')
    expect(from).toHaveBeenCalledWith('agent_referral_links')
    expect(select).toHaveBeenCalledWith('code')
    expect(eq).toHaveBeenCalledWith('active', true)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('returns no code if none exists and does not leak read errors', async () => {
    const maybeSingle = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'private backend error' } })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    from.mockReturnValue({ select })

    await expect(loadAgentReferralCode()).resolves.toBeNull()
    await expect(loadAgentReferralCode()).rejects.toThrow('agent_referral_link_read_failed:42501')
    expect(rpc).not.toHaveBeenCalled()
  })

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
