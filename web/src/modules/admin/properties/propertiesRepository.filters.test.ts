import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchModerationProperties } from './propertiesRepository'
import type { PropertyModerationFilters } from '../core/types'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))

vi.mock('../../../shared/config/features', () => ({ IMAGE_DUPLICATE_MODERATION_ENABLED: false }))
vi.mock('../../../shared/lib/supabaseClient', () => ({ supabase: { from: fromMock } }))

function createQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    range: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.order.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.or.mockReturnValue(query)
  query.gte.mockReturnValue(query)
  query.lt.mockReturnValue(query)
  query.range.mockResolvedValue(result)
  return query
}

describe('moderation property query filters', () => {
  beforeEach(() => fromMock.mockReset())

  it('applies status, text, operation, type and date filters before server pagination', async () => {
    const propertyQuery = createQuery({ data: [], count: 42, error: null })
    const profileQuery = createQuery({ data: [], error: null })
    fromMock.mockReturnValueOnce(propertyQuery).mockReturnValueOnce(profileQuery)
    const filters: PropertyModerationFilters = {
      query: 'Casa nueva',
      operation: 'venta',
      propertyType: 'casa',
      createdAfter: '2026-10-01',
      createdBefore: '2026-10-13',
    }

    const result = await fetchModerationProperties('published', 2, filters)

    expect(propertyQuery.eq).toHaveBeenCalledWith('status', 'published')
    expect(propertyQuery.or).toHaveBeenCalledWith('title.ilike.%Casa nueva%,location.ilike.%Casa nueva%')
    expect(propertyQuery.eq).toHaveBeenCalledWith('operation', 'venta')
    expect(propertyQuery.eq).toHaveBeenCalledWith('property_type', 'casa')
    expect(propertyQuery.gte).toHaveBeenCalledWith('created_at', '2026-10-01T00:00:00.000Z')
    expect(propertyQuery.lt).toHaveBeenCalledWith('created_at', '2026-10-14T00:00:00.000Z')
    expect(propertyQuery.range).toHaveBeenCalledWith(30, 44)
    expect(result.total).toBe(42)
    expect(result.properties).toEqual([])
  })

  it('strips PostgREST filter syntax from free text before building the search clause', async () => {
    const propertyQuery = createQuery({ data: [], count: 0, error: null })
    const profileQuery = createQuery({ data: [], error: null })
    fromMock.mockReturnValueOnce(propertyQuery).mockReturnValueOnce(profileQuery)

    await fetchModerationProperties('all', 0, {
      query: 'casa, (x).*, y', operation: 'all', propertyType: 'all', createdAfter: '', createdBefore: '',
    })

    expect(propertyQuery.or).toHaveBeenCalledWith('title.ilike.%casa x y%,location.ilike.%casa x y%')
  })
})
