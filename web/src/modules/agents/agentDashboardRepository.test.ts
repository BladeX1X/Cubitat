import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAgentDashboard, setOwnerPropertyVisibility } from './agentDashboardRepository'
import { supabase } from '../../shared/lib/supabaseClient'

vi.mock('../../shared/lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }))

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

  it('allows owners to toggle only published and owner-hidden properties', async () => {
    const chain = { eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() }
    chain.eq.mockReturnValue(chain)
    chain.select.mockReturnValue(chain)
    chain.maybeSingle.mockResolvedValue({ data: { id: 'property-1', status: 'owner_hidden' }, error: null })
    vi.mocked(supabase.from).mockReturnValue({ update: () => chain } as never)
    await expect(setOwnerPropertyVisibility('property-1', 'owner-1', 'published')).resolves.toBe('owner_hidden')
    await expect(setOwnerPropertyVisibility('property-1', 'owner-1', 'paused')).rejects.toThrow('not_allowed')
  })

  it('rejects a visibility change when no matching row was updated', async () => {
    const chain = { eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() }
    chain.eq.mockReturnValue(chain)
    chain.select.mockReturnValue(chain)
    chain.maybeSingle.mockResolvedValue({ data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue({ update: () => chain } as never)

    await expect(setOwnerPropertyVisibility('property-1', 'owner-1', 'published'))
      .rejects.toThrow('conflict')
  })
})
