import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, from, createSignedUrls } = vi.hoisted(() => {
  const query = {
    select: vi.fn(), eq: vi.fn(), neq: vi.fn(), order: vi.fn(), range: vi.fn(), or: vi.fn(),
  }
  Object.values(query).forEach((method) => method.mockReturnValue(query))
  return { query, from: vi.fn(() => query), createSignedUrls: vi.fn() }
})

vi.mock('../../shared/lib/supabaseClient', () => ({ supabase: { from, storage: { from: () => ({ createSignedUrls }) } } }))
vi.mock('../../shared/lib/logger', () => ({ logSafeEvent: vi.fn(), sanitizeErrorReason: vi.fn(() => 'test') }))

import { fetchMaterialListings } from './materialRepository'

describe('fetchMaterialListings filters and pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.values(query).filter((method) => typeof method === 'function').forEach((method) => method.mockReturnValue(query))
    query.select.mockReturnValue(query)
    query.range.mockReturnValue(query)
    createSignedUrls.mockResolvedValue({ data: [], error: null })
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

  it('marks a referenced private photo unavailable when Storage cannot sign it', async () => {
    const photoPath = 'f7adba7c-367d-42a8-933a-af01f7f9155a/45c8e993-b64a-4d1c-9e58-20ad1a25eb6b/72b35ff4-8507-4950-ab14-ed1d9dd34042.webp'
    Object.assign(query, {
      data: [{ id: '1', slug: 'cemento', title: 'Cemento gris', category: 'cemento', description: 'Cemento para obra', price: 1, currency: 'USD', province: 'La Habana', availability: 'limited', photo_urls: [photoPath], updated_at: '2026-11-05T00:00:00Z' }],
    })
    createSignedUrls.mockResolvedValue({ data: [{ path: photoPath, signedUrl: null, error: { message: 'storage unavailable' } }], error: null })

    const result = await fetchMaterialListings()

    expect(createSignedUrls).toHaveBeenCalledWith([photoPath], 3600)
    expect(result.items[0]).toMatchObject({ photoUrls: [], photoUnavailable: true })
  })
})
