import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, from } = vi.hoisted(() => {
  const query = {
    select: vi.fn(), eq: vi.fn(), neq: vi.fn(), order: vi.fn(), range: vi.fn(), or: vi.fn(),
  }
  Object.values(query).forEach((method) => method.mockReturnValue(query))
  return { query, from: vi.fn(() => query) }
})

vi.mock('../../shared/lib/supabaseClient', () => ({ supabase: { from } }))
vi.mock('../../shared/lib/logger', () => ({ logSafeEvent: vi.fn(), sanitizeErrorReason: vi.fn(() => 'test') }))
vi.mock('./materialPhotos', () => ({
  isMaterialPhotoPath: vi.fn(() => false), isMaterialPhotoReference: vi.fn(() => false),
  materialPhotoExtension: vi.fn(), MATERIAL_PHOTO_BUCKET: 'material-listings', validateMaterialPhotoFiles: vi.fn(),
}))

import { fetchMaterialListings } from './materialRepository'

describe('fetchMaterialListings filters and pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.values(query).forEach((method) => method.mockReturnValue(query))
    query.select.mockReturnValue(query)
    query.range.mockReturnValue(query)
    Object.assign(query, {
      data: [{ id: '1', slug: 'cemento', title: 'Cemento gris', category: 'cemento', description: 'Cemento para obra', price: 1, currency: 'USD', province: 'La Habana', availability: 'limited', photo_urls: [], updated_at: '2026-11-05T00:00:00Z' }],
      error: null,
      count: 37,
    })
  })

  it('sends search, filters and page range to Supabase and returns the exact total', async () => {
    const result = await fetchMaterialListings({ category: 'cemento', province: 'La Habana', availability: 'limited', search: 'cemento', offset: 24 })

    expect(from).toHaveBeenCalledWith('material_listings')
    expect(query.select).toHaveBeenCalledWith(expect.any(String), { count: 'exact' })
    expect(query.neq).toHaveBeenCalledWith('availability', 'out_of_stock')
    expect(query.eq).toHaveBeenCalledWith('category', 'cemento')
    expect(query.eq).toHaveBeenCalledWith('province', 'La Habana')
    expect(query.eq).toHaveBeenCalledWith('availability', 'limited')
    expect(query.or).toHaveBeenCalledWith('title.ilike.%cemento%,description.ilike.%cemento%')
    expect(query.range).toHaveBeenCalledWith(24, 47)
    expect(result).toMatchObject({ total: 37, items: [{ id: '1', title: 'Cemento gris' }] })
  })
})
