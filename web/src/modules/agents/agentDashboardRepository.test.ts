import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAgentDashboard, setOwnerPropertyVisibility } from './agentDashboardRepository'
import { supabase } from '../../shared/lib/supabaseClient'

vi.mock('../../shared/lib/supabaseClient', () => ({ supabase: { from: vi.fn() } }))

describe('agentDashboardRepository', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads only the authenticated owner data and requires verified status', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role: 'user', verification_status: 'verified' }, error: null }) }) }) } as never)
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ order: async () => ({ data: [{ id: 'property-1' }], error: null }) }) }) } as never)
    const result = await loadAgentDashboard('owner-1')
    expect(result.isVerifiedAgent).toBe(true)
    expect(result.properties).toEqual([{ id: 'property-1' }])
  })

  it('allows owners to toggle only published and owner-hidden properties', async () => {
    const chain = { eq: vi.fn() }
    chain.eq.mockReturnValueOnce(chain).mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null })
    vi.mocked(supabase.from).mockReturnValue({ update: () => chain } as never)
    await expect(setOwnerPropertyVisibility('property-1', 'owner-1', 'published')).resolves.toBe('owner_hidden')
    await expect(setOwnerPropertyVisibility('property-1', 'owner-1', 'paused')).rejects.toThrow('not_allowed')
  })
})
