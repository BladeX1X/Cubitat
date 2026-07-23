import { describe, expect, it, vi } from 'vitest'
import { fetchAgentProfile, fetchAgentProperties } from './agentRepository'
import { supabase } from '../../shared/lib/supabaseClient'

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

describe('agentRepository', () => {
  it('fetches agent profile successfully', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: [{
        id: 'agent-1',
        full_name: 'Carlos Agente',
        agency_name: 'Habana Real Estate',
        verification_status: 'verified',
        created_at: new Date().toISOString(),
        active_properties_count: 3,
        reports_count: 0,
      }],
      error: null,
    } as never)

    const profile = await fetchAgentProfile('agent-1')
    expect(profile).not.toBeNull()
    expect(profile?.full_name).toBe('Carlos Agente')
    expect(profile?.agency_name).toBe('Habana Real Estate')
    expect(profile?.verification_status).toBe('verified')
    expect(supabase.rpc).toHaveBeenCalledWith('get_public_agent_profile', { p_agent_id: 'agent-1' })
  })

  it('returns null when agent profile is not found', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: [],
      error: null,
    } as never)

    const profile = await fetchAgentProfile('invalid-id')
    expect(profile).toBeNull()
  })

  it('rejects when the public profile RPC fails', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: null,
      error: { message: 'Database unavailable' },
    } as never)

    await expect(fetchAgentProfile('agent-1')).rejects.toThrow('AGENT_PROFILE_LOAD_FAILED')
  })

  it('fetches agent published properties list', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq1 = vi.fn().mockReturnThis()
    const mockEq2 = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockResolvedValueOnce({
      data: [{ id: 'p1', title: 'Propiedad 1', status: 'published' }],
      error: null,
    })

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: mockSelect,
      eq: mockEq1,
      order: mockOrder,
    } as any)
    mockEq1.mockReturnValue({ eq: mockEq2, order: mockOrder })

    const properties = await fetchAgentProperties('agent-1')
    expect(properties).toHaveLength(1)
    expect(properties[0].title).toBe('Propiedad 1')
  })
})
