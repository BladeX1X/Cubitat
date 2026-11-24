import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchModerationProperties } from './propertiesRepository'

const { fromMock, rpcMock } = vi.hoisted(() => ({ fromMock: vi.fn(), rpcMock: vi.fn() }))

vi.mock('../../../shared/config/features', () => ({ IMAGE_DUPLICATE_MODERATION_ENABLED: false }))
vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: { from: fromMock, rpc: rpcMock },
}))

function query(result: unknown) {
  const chain = {
    select: vi.fn(),
    order: vi.fn(),
    eq: vi.fn(),
    range: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.order.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.range.mockResolvedValue(result)
  chain.in.mockResolvedValue(result)
  chain.is.mockReturnValue(chain)
  return chain
}

describe('moderation property contact loading', () => {
  beforeEach(() => {
    fromMock.mockReset()
    rpcMock.mockReset().mockResolvedValue({ data: [], error: null })
  })

  it('loads contact details through the AAL2 admin RPC, not properties.contact_info', async () => {
    const properties = query({
      data: [{
        id: 'property-1', title: 'Casa', location: 'La Habana', description: '',
        price_usd: 100, cover_image: null, images: [], created_at: '2026-10-01',
        user_id: 'owner-1', operation: 'venta', property_type: 'casa', bedrooms: 2,
        bathrooms: 1, parking: 0, area_m2: 80, age_years: null, amenities: [],
        features: {}, status: 'pending_review', moderation_message: null,
      }],
      count: 1,
      error: null,
    })
    const profiles = query({
      data: [{ id: 'owner-1', full_name: 'Owner', email: 'owner@example.com' }],
      error: null,
    })
    fromMock.mockReturnValueOnce(properties).mockReturnValueOnce(profiles)
    rpcMock.mockImplementation(async (name: string) => name === 'get_admin_property_contact_details'
      ? { data: [{ property_id: 'property-1', contact_info: { name: 'Owner', phone: '+5355512345' } }], error: null }
      : { data: [], error: null })

    const result = await fetchModerationProperties('pending_review', 0)

    expect(properties.select).toHaveBeenCalledWith(
      'id,title,location,description,price_usd,price_currency,cover_image,images,created_at,user_id,operation,property_type,bedrooms,bathrooms,parking,area_m2,age_years,amenities,features,status,moderation_message',
      { count: 'exact' },
    )
    expect(rpcMock).toHaveBeenCalledWith('get_admin_property_contact_details', {
      p_property_ids: ['property-1'],
    })
    expect(result.properties[0].contact_info).toEqual({ name: 'Owner', phone: '+5355512345' })
  })

  it('keeps the property list when private contact enrichment fails', async () => {
    const properties = query({
      data: [{
        id: 'property-1', title: 'Casa', location: 'La Habana', description: '', price_usd: 100,
        cover_image: null, images: [], created_at: '2026-10-01', user_id: 'owner-1', operation: 'venta',
        property_type: 'casa', bedrooms: 2, bathrooms: 1, parking: 0, area_m2: 80, age_years: null,
        amenities: [], features: {}, status: 'pending_review', moderation_message: null,
      }], count: 1, error: null,
    })
    const profiles = query({ data: [{ id: 'owner-1', full_name: 'Owner', email: 'owner@example.com' }], error: null })
    fromMock.mockReturnValueOnce(properties).mockReturnValueOnce(profiles)
    rpcMock.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'RPC unavailable' } })

    const result = await fetchModerationProperties('pending_review', 0)

    expect(result.properties).toHaveLength(1)
    expect(result.properties[0].contact_info).toBeNull()
    expect(result.warnings).toContain('No se pudieron cargar los datos privados de contacto (código: PGRST202).')
  })
})
