import { describe, expect, it, vi } from 'vitest'
import { fetchAgentProfile, fetchAgentProperties } from './agentRepository'
import { supabase } from '../../shared/lib/supabaseClient'

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('agentRepository', () => {
  it('fetches agent profile successfully', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: {
        id: 'agent-1',
        full_name: 'Carlos Agente',
        agency_name: 'Habana Real Estate',
        verification_status: 'verified',
        created_at: new Date().toISOString(),
      },
      error: null,
    })

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any)

    const profile = await fetchAgentProfile('agent-1')
    expect(profile).not.toBeNull()
    expect(profile?.full_name).toBe('Carlos Agente')
    expect(profile?.agency_name).toBe('Habana Real Estate')
    expect(profile?.verification_status).toBe('verified')
  })

  it('returns null when agent profile is not found', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' },
    })

    vi.mocked(supabase.from).mockReturnValueOnce({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
    } as any)

    const profile = await fetchAgentProfile('invalid-id')
    expect(profile).toBeNull()
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
