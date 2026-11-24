import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authGetUser, fromMock, insertMock, selectMock, singleMock, rpcMock } = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  fromMock: vi.fn(),
  insertMock: vi.fn(),
  selectMock: vi.fn(),
  singleMock: vi.fn(),
  rpcMock: vi.fn(),
}))

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: {
    auth: { getUser: authGetUser },
    from: fromMock,
    rpc: rpcMock,
  },
}))
vi.mock('../../shared/lib/logger', () => ({
  logSafeEvent: vi.fn(),
  sanitizeErrorReason: vi.fn(() => 'DATABASE_23505'),
}))

import { createMaterialListing } from './materialRepository'

const listingId = '11111111-1111-4111-8111-111111111111'
const stableSlug = 'cemento-para-reparacion-11111111111111111111111111111111'
const ownerId = '22222222-2222-4222-8222-222222222222'
const input = {
  title: 'Cemento para reparación',
  category: 'cemento' as const,
  description: 'Anuncio de prueba con información suficiente.',
  price: 20,
  currency: 'USD' as const,
  province: 'La Habana',
  coordinates: null,
  availability: 'available' as const,
  phone: null,
  whatsapp: null,
}

describe('createMaterialListing retry safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const query = { insert: insertMock, select: selectMock, single: singleMock }
    fromMock.mockReturnValue(query)
    insertMock.mockReturnValue(query)
    selectMock.mockReturnValue(query)
    authGetUser.mockResolvedValue({ data: { user: { id: ownerId } }, error: null })
    singleMock.mockResolvedValue({ data: { id: listingId }, error: null })
    rpcMock.mockResolvedValue({ data: [], error: null })
  })

  it('uses the retry-stable id and slug when creating a new listing', async () => {
    await expect(createMaterialListing(input, stableSlug)).resolves.toBe(listingId)

    expect(fromMock).toHaveBeenCalledWith('material_listings')
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      owner_id: ownerId,
      slug: stableSlug,
      coordinates: null,
      photo_urls: [],
    }))
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('reuses the owned pending listing when the prior insert committed but its response was lost', async () => {
    singleMock.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate key', details: 'Key (slug) already exists in material_listings_slug_key' },
    })
    const committedId = '33333333-3333-4333-8333-333333333333'
    rpcMock.mockResolvedValueOnce({ data: [{ id: committedId, slug: stableSlug, status: 'pending_review' }], error: null })

    await expect(createMaterialListing(input, stableSlug)).resolves.toBe(committedId)
    expect(rpcMock).toHaveBeenCalledWith('get_my_material_listings')
  })

  it('does not treat another listing or a different status as a safe retry', async () => {
    singleMock.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate key', details: 'Key (slug) already exists in material_listings_slug_key' },
    })
    rpcMock.mockResolvedValueOnce({ data: [{ id: listingId, slug: 'other-slug', status: 'pending_review' }], error: null })

    await expect(createMaterialListing(input, stableSlug)).rejects.toThrow('MATERIAL_LISTING_CREATE_FAILED')
  })
})
