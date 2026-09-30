import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchModerationProperties } from './propertiesRepository'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))

vi.mock('../../../shared/config/features', () => ({ PHASE_TWO_ENABLED: true }))
vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: { from: fromMock },
}))

function chain(result: unknown) {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    eq: vi.fn(),
    range: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
  }
  query.select.mockReturnValue(query)
  query.order.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.range.mockResolvedValue(result)
  query.in.mockResolvedValue(result)
  query.is.mockReturnValue(query)
  return query
}

describe('moderation duplicate flag loading', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('joins the private DEV flag with the related property title', async () => {
    const propertyQuery = chain({
      data: [{
        id: 'property-1', title: 'Casa nueva', location: 'La Habana', description: '',
        price_usd: 100, cover_image: null, images: null, created_at: '2026-09-28',
        user_id: 'owner-1', operation: 'venta', property_type: 'casa', bedrooms: 2,
        bathrooms: 1, parking: 0, area_m2: 80, age_years: null, amenities: null,
        features: null, contact_info: null, status: 'pending_review', moderation_message: null,
      }],
      count: 1,
      error: null,
    })
    const profileQuery = chain({ data: [{ id: 'owner-1', full_name: 'Owner', email: 'owner@example.com' }], error: null })
    const flagQuery = chain({ data: [{ property_id: 'property-1', duplicate_of: 'property-2' }], error: null })
    const duplicatePropertyQuery = chain({ data: [{ id: 'property-2', title: 'Casa original' }], error: null })
    flagQuery.in.mockReturnValue(flagQuery)
    flagQuery.is.mockResolvedValue({ data: [{ property_id: 'property-1', duplicate_of: 'property-2' }], error: null })

    fromMock
      .mockReturnValueOnce(propertyQuery)
      .mockReturnValueOnce(profileQuery)
      .mockReturnValueOnce(flagQuery)
      .mockReturnValueOnce(duplicatePropertyQuery)

    const result = await fetchModerationProperties('pending_review', 0)

    expect(result.properties[0]).toMatchObject({
      duplicate_of: 'property-2',
      duplicate_title: 'Casa original',
      user_email: 'Owner · owner@example.com',
    })
    expect(flagQuery.in).toHaveBeenCalledWith('property_id', ['property-1'])
    expect(flagQuery.is).toHaveBeenCalledWith('resolved_at', null)
    expect(duplicatePropertyQuery.in).toHaveBeenCalledWith('id', ['property-2'])
  })
})
