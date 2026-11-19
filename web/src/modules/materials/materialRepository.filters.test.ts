import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, from, createSignedUrls, createSignedUrl, getUser } = vi.hoisted(() => {
  const query = {
    select: vi.fn(), eq: vi.fn(), neq: vi.fn(), order: vi.fn(), range: vi.fn(), or: vi.fn(),
  }
  Object.values(query).forEach((method) => method.mockReturnValue(query))
  return { query, from: vi.fn(() => query), createSignedUrls: vi.fn(), createSignedUrl: vi.fn(), getUser: vi.fn() }
})

vi.mock('../../shared/lib/supabaseClient', () => ({ supabase: { auth: { getUser }, from, storage: { from: () => ({ createSignedUrls, createSignedUrl }) } } }))
vi.mock('../../shared/lib/logger', () => ({ logSafeEvent: vi.fn(), sanitizeErrorReason: vi.fn(() => 'test') }))

import { createOwnedMaterialPhotoPreviews, fetchMaterialListings } from './materialRepository'

describe('fetchMaterialListings filters and pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.values(query).filter((method) => typeof method === 'function').forEach((method) => method.mockReturnValue(query))
    query.select.mockReturnValue(query)
    query.range.mockReturnValue(query)
    createSignedUrls.mockResolvedValue({ data: [], error: null })
    createSignedUrl.mockResolvedValue({ data: null, error: null })
    getUser.mockResolvedValue({ data: { user: { id: '11111111-1111-4111-8111-111111111111' } }, error: null })
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

  it('retains a private cover path so the card can sign only near the viewport', async () => {
    const photoPath = 'f7adba7c-367d-42a8-933a-af01f7f9155a/45c8e993-b64a-4d1c-9e58-20ad1a25eb6b/72b35ff4-8507-4950-ab14-ed1d9dd34042.webp'
    Object.assign(query, {
      data: [{ id: '1', slug: 'cemento', title: 'Cemento gris', category: 'cemento', description: 'Cemento para obra', price: 1, currency: 'USD', province: 'La Habana', availability: 'limited', photo_urls: [photoPath], updated_at: '2026-11-05T00:00:00Z' }],
    })
    const result = await fetchMaterialListings()

    expect(createSignedUrls).not.toHaveBeenCalled()
    expect(createSignedUrl).not.toHaveBeenCalled()
    expect(result.items[0]).toMatchObject({ photoUrls: [photoPath], photoUnavailable: false })
  })

  it('signs only photo paths belonging to the current owner and edited listing', async () => {
    const ownerId = '11111111-1111-4111-8111-111111111111'
    const listingId = '22222222-2222-4222-8222-222222222222'
    const photoPath = `${ownerId}/${listingId}/33333333-3333-4333-8333-333333333333.webp`
    const otherOwnerPath = `44444444-4444-4444-8444-444444444444/${listingId}/55555555-5555-4555-8555-555555555555.webp`
    const otherListingPath = `${ownerId}/66666666-6666-4666-8666-666666666666/77777777-7777-4777-8777-777777777777.webp`
    createSignedUrls.mockResolvedValue({ data: [{ path: photoPath, signedUrl: 'https://example.test/signed.webp?token=temporary' }], error: null })

    const result = await createOwnedMaterialPhotoPreviews(listingId, [photoPath, otherOwnerPath, otherListingPath])

    expect(createSignedUrls).toHaveBeenCalledWith([photoPath], 3600)
    expect(result).toEqual({ photos: [{ path: photoPath, url: 'https://example.test/signed.webp?token=temporary' }], unavailableCount: 2 })
  })
})
