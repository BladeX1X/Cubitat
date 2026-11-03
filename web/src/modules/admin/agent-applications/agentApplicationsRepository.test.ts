import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPendingAgentApplications } from './agentApplicationsRepository'

const query = vi.hoisted(() => ({
  select: vi.fn(),
  in: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
}))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: { from: vi.fn(() => query) },
}))

describe('agentApplicationsRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    query.select.mockReturnValue(query)
    query.in.mockReturnValue(query)
    query.order.mockReturnValue(query)
  })

  it('uses an exact count and fetches a bounded page for large review queues', async () => {
    query.range.mockResolvedValue({ data: [{ id: 'application-21' }], count: 306, error: null })

    const result = await fetchPendingAgentApplications(1)

    expect(query.select).toHaveBeenCalledWith(
      'id,user_id,province,education_title,experience_summary,status,created_at',
      { count: 'exact' },
    )
    expect(query.in).toHaveBeenCalledWith('status', ['submitted', 'reviewing', 'waitlisted'])
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: true })
    expect(query.range).toHaveBeenCalledWith(20, 39)
    expect(result).toEqual({ items: [{ id: 'application-21' }], total: 306 })
  })

  it('does not turn query errors into an empty queue', async () => {
    query.range.mockResolvedValue({ data: null, count: null, error: new Error('RLS unavailable') })
    await expect(fetchPendingAgentApplications(1)).rejects.toThrow('No se pudieron cargar las postulaciones.')
  })
})
