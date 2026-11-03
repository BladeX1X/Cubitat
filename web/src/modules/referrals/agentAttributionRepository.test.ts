import { beforeEach, describe, expect, it, vi } from 'vitest'

const { from, order, eq } = vi.hoisted(() => ({ from: vi.fn(), order: vi.fn(), eq: vi.fn() }))
vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: { from },
}))

import { loadAgentAttributedContacts } from './agentAttributionRepository'

describe('agent attribution domain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    from.mockReturnValue({ select: () => ({ eq, order }) })
    eq.mockReturnValue({ order })
    order.mockResolvedValue({ data: [{ id: 'contact-1', referral_id: 'AG-12AB34CD' }], error: null })
  })

  it('loads contacts by the active referral code and lets RLS filter ownership', async () => {
    await expect(loadAgentAttributedContacts('AG-12AB34CD')).resolves.toHaveLength(1)
    expect(from).toHaveBeenCalledWith('contacts')
    expect(eq).toHaveBeenCalledWith('referral_id', 'AG-12AB34CD')
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('returns a safe domain error when contact reads fail', async () => {
    order.mockResolvedValueOnce({ data: null, error: new Error('private detail') })
    await expect(loadAgentAttributedContacts('AG-12AB34CD')).rejects.toThrow('agent_attributed_contacts_load_failed')
  })
})
