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

  function mockProfile(role: string, verification_status: string) {
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role, verification_status }, error: null }) }) }),
    } as never)
  }

  function mockProperties(data: unknown[] = []) {
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: () => ({ eq: () => ({ order: async () => ({ data, error: null }) }) }),
    } as never)
  }

  it('does not load properties for a buyer even when KYC is verified', async () => {
    mockProfile('buyer', 'verified')

    const result = await loadAgentDashboard('owner-1')

    expect(result.isVerifiedAgent).toBe(false)
    expect(result.properties).toEqual([])
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('treats a verified administrator as an eligible agent', async () => {
    mockProfile('admin', 'verified')
    mockProperties([{ id: 'property-1', view_count: 9 }])
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ property_id: 'property-1', phone_clicks_count: 2, whatsapp_clicks_count: 3 }], error: null } as never)

    const result = await loadAgentDashboard('admin-1')

    expect(result.isVerifiedAgent).toBe(true)
    expect(result.properties).toEqual([{ id: 'property-1', view_count: 9, phone_clicks_count: 2, whatsapp_clicks_count: 3 }])
    expect(supabase.from).toHaveBeenCalledTimes(2)
    expect(supabase.rpc).toHaveBeenCalledWith('get_own_property_contact_metrics')
  })

  it('treats a verified agent as eligible', async () => {
    mockProfile('agent', 'verified')
    mockProperties()
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never)

    const result = await loadAgentDashboard('agent-1')

    expect(result.isVerifiedAgent).toBe(true)
    expect(supabase.from).toHaveBeenCalledTimes(2)
    expect(supabase.rpc).toHaveBeenCalledWith('get_own_property_contact_metrics')
  })

  it('keeps property data visible if private contact metrics fail to load', async () => {
    mockProfile('agent', 'verified')
    mockProperties([{ id: 'property-1' }])
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: 'forbidden' } } as never)

    await expect(loadAgentDashboard('agent-1')).resolves.toMatchObject({
      contactMetricsAvailable: false,
      properties: [{ id: 'property-1', phone_clicks_count: undefined, whatsapp_clicks_count: undefined }],
    })
  })

  it('blocks an administrator without verified KYC before loading properties', async () => {
    mockProfile('admin', 'pending')

    const result = await loadAgentDashboard('admin-1')

    expect(result.isVerifiedAgent).toBe(false)
    expect(result.properties).toEqual([])
    expect(supabase.from).toHaveBeenCalledTimes(1)
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
