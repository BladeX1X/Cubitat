import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, from, storageFrom, createSignedUrl } = vi.hoisted(() => {
  const query = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), contains: vi.fn(), or: vi.fn(), maybeSingle: vi.fn(),
  }
  Object.values(query).forEach(method => method.mockReturnValue(query))
  return { query, from: vi.fn(() => query), storageFrom: vi.fn(), createSignedUrl: vi.fn() }
})

vi.mock('../../shared/lib/supabaseClient', () => ({
  supabase: { from, storage: { from: storageFrom } },
}))
vi.mock('../../shared/lib/logger', () => ({
  logSafeEvent: vi.fn(),
  sanitizeErrorReason: vi.fn(() => 'test'),
}))

import { fetchHomeServiceProvider, fetchHomeServiceProviders } from './homeServiceRepository'

const legacyPath = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/11111111-1111-4111-8111-111111111111.jpg'
const currentPath = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc/22222222-2222-4222-8222-222222222222.webp'

describe('fetchHomeServiceProviders gallery references', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.values(query).forEach(method => method.mockReturnValue(query))
    query.range.mockResolvedValue({
      data: [{
        id: 'service-1', slug: 'service-qa', display_name: 'Servicio QA', category: 'plomeria',
        description: 'Perfil sintético para QA.', province: 'La Habana', municipalities: ['Playa'],
        gallery_urls: [legacyPath, currentPath], updated_at: '2026-11-14T00:00:00Z',
      }],
      error: null,
      count: 1,
    })
    createSignedUrl.mockImplementation(async (bucket: string, path: string) => ({
      data: { signedUrl: `https://signed.invalid/${bucket}/${encodeURIComponent(path)}` },
      error: null,
    }))
    storageFrom.mockImplementation((bucket: string) => ({
      createSignedUrl: (path: string, expiresIn: number, options: unknown) => createSignedUrl(bucket, path, expiresIn, options),
      createSignedUrls: vi.fn(async (paths: string[]) => ({
        data: paths.map(path => ({ path, signedUrl: `https://signed.invalid/${bucket}/${encodeURIComponent(path)}` })),
        error: null,
      })),
    }))
  })

  it('retains private photo paths so directory cards can sign near the viewport', async () => {
    const result = await fetchHomeServiceProviders()

    expect(storageFrom).not.toHaveBeenCalled()
    expect(storageFrom).not.toHaveBeenCalledWith('home-service-photos')
    expect(createSignedUrl).not.toHaveBeenCalled()
    expect(result.items[0]?.galleryUrls).toEqual([legacyPath, currentPath])
  })

  it('still signs the full gallery when opening a provider detail', async () => {
    query.maybeSingle.mockResolvedValue({
      data: {
        id: 'service-1', slug: 'service-qa', display_name: 'Servicio QA', category: 'plomeria',
        description: 'Perfil sintético para QA.', province: 'La Habana', municipalities: ['Playa'],
        gallery_urls: [legacyPath, currentPath], updated_at: '2026-11-14T00:00:00Z',
      },
      error: null,
    })

    const result = await fetchHomeServiceProvider('service-qa')

    expect(result?.galleryUrls).toHaveLength(2)
    expect(storageFrom).toHaveBeenCalledWith('home-service-profiles')
    expect(storageFrom).toHaveBeenCalledWith('home-service-photos')
    expect(createSignedUrl).not.toHaveBeenCalled()
  })
})
