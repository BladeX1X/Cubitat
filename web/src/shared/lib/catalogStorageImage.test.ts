import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSignedUrl } = vi.hoisted(() => ({ createSignedUrl: vi.fn() }))

vi.mock('./supabaseClient', () => ({
  supabase: { storage: { from: vi.fn(() => ({ createSignedUrl })) } },
}))

import { signCatalogCardImage } from './catalogStorageImage'

describe('signCatalogCardImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests a time-limited card thumbnail from private Storage', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.test/thumb' }, error: null })

    const result = await signCatalogCardImage('material-listings', 'owner/listing/photo.webp')

    expect(createSignedUrl).toHaveBeenCalledWith('owner/listing/photo.webp', 3600, {
      transform: { width: 420, height: 192, resize: 'cover', quality: 65 },
    })
    expect(result).toBe('https://signed.test/thumb')
  })

  it('returns null when Storage cannot produce the transformed signed URL', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: new Error('image transformations unavailable') })

    await expect(signCatalogCardImage('home-service-photos', 'owner/photo.webp')).resolves.toBeNull()
  })
})
