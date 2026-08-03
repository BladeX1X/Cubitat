import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAgentDashboard, setOwnerPropertyVisibility } from './agentDashboardRepository'
import { supabase } from '../../shared/lib/supabaseClient'

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

describe('agentDashboardRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires both the agent role and verified KYC', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'buyer', verification_status: 'verified' }, error: null }) }) }) } as never)
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ order: async () => ({ data: [{ id: 'property-1', phone_clicks_count: 2, whatsapp_clicks_count: 3 }], error: null }) }) }) } as never)
    const result = await loadAgentDashboard('owner-1')
    expect(result.isVerifiedAgent).toBe(false)
    expect(result.properties).toEqual([{ id: 'property-1', phone_clicks_count: 2, whatsapp_clicks_count: 3 }])
  })

  it('does not treat an administrator as a verified agent', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'admin', verification_status: 'verified' }, error: null }) }) }) } as never)
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }) } as never)

    const result = await loadAgentDashboard('admin-1')

    expect(result.isVerifiedAgent).toBe(false)
  })

  it('allows owners to toggle only published and owner-hidden properties', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)

    await expect(setOwnerPropertyVisibility('property-1', 'owner-1', 'published')).resolves.toBe('owner_hidden')
    expect(supabase.rpc).toHaveBeenLastCalledWith('hide_own_property', { p_property_id: 'property-1' })

    await expect(setOwnerPropertyVisibility('property-1', 'owner-1', 'owner_hidden')).resolves.toBe('published')
    expect(supabase.rpc).toHaveBeenLastCalledWith('restore_own_property', { p_property_id: 'property-1' })

    await expect(setOwnerPropertyVisibility('property-1', 'owner-1', 'paused')).rejects.toThrow('not_allowed')
  })

  it('rejects a visibility change when the protected RPC fails', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'forbidden' } } as never)

    await expect(setOwnerPropertyVisibility('property-1', 'owner-1', 'published'))
      .rejects.toThrow('update_failed')
  })
})
