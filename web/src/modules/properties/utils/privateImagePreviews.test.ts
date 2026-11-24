import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ download: vi.fn() }))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: { storage: { from: () => ({ download: mocks.download }) } },
}))

import { createOwnedPropertyCoverPreviews, createOwnedPropertyImagePreview, isOwnedPropertyImageReference, revokePrivateImagePreviewUrls } from './privateImagePreviews'

const ownerId = '11111111-1111-4111-8111-111111111111'
const photoId = '22222222-2222-4222-8222-222222222222'
const otherOwnerId = '33333333-3333-4333-8333-333333333333'
const legacyPhotoName = '1763481234567-0.webp'
function imageSource(folderId = ownerId) {
  return `${window.location.origin}/api/supabase/storage/v1/object/public/property_images/${folderId}/${photoId}.webp`
}
function legacyImageSource(folderId = ownerId, filename = legacyPhotoName) {
  return `${window.location.origin}/api/supabase/storage/v1/object/public/property_images/${folderId}/${filename}`
}
function directSupabaseImageSource(folderId = ownerId) {
  return `https://bknwerqbbysveehcdmzr.supabase.co/storage/v1/object/public/property_images/${folderId}/${photoId}.webp`
}

describe('private property cover previews', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    mocks.download.mockReset()
    mocks.download.mockResolvedValue({ data: new Blob(['webp'], { type: 'image/webp' }), error: null })
  })

  afterEach(() => vi.restoreAllMocks())

  it('downloads an existing owner image through authenticated Storage for the edit preview', async () => {
    const previewUrl = 'blob:edit-preview'
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue(previewUrl)
    const result = await createOwnedPropertyImagePreview(imageSource(), ownerId)

    expect(mocks.download).toHaveBeenCalledWith(`${ownerId}/${photoId}.webp`)
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(result).toEqual({ previewUrl, size: 4 })
  })

  it('validates the owner of canonical storage references before the editor preserves them', () => {
    expect(isOwnedPropertyImageReference(imageSource(), ownerId)).toBe(true)
    expect(isOwnedPropertyImageReference(imageSource(otherOwnerId), ownerId)).toBe(false)
    expect(isOwnedPropertyImageReference(`${imageSource()}?token=unexpected`, ownerId)).toBe(false)
  })

  it('accepts only the owner-scoped legacy timestamp filename format', async () => {
    expect(isOwnedPropertyImageReference(legacyImageSource(), ownerId)).toBe(true)
    expect(isOwnedPropertyImageReference(legacyImageSource(otherOwnerId), ownerId)).toBe(false)
    expect(isOwnedPropertyImageReference(legacyImageSource(ownerId, 'photo.webp'), ownerId)).toBe(false)
    expect(isOwnedPropertyImageReference(legacyImageSource(ownerId, '1763481234567-123.webp'), ownerId)).toBe(false)
    expect(isOwnedPropertyImageReference(legacyImageSource(ownerId, '1763481234567-20.webp'), ownerId)).toBe(false)

    const result = await createOwnedPropertyImagePreview(legacyImageSource(), ownerId)

    expect(mocks.download).toHaveBeenCalledWith(`${ownerId}/${legacyPhotoName}`)
    expect(result).toMatchObject({ size: 4 })
  })

  it('recognizes legacy direct Supabase URLs but downloads through the configured app client', async () => {
    const result = await createOwnedPropertyImagePreview(directSupabaseImageSource(), ownerId)

    expect(mocks.download).toHaveBeenCalledWith(`${ownerId}/${photoId}.webp`)
    expect(result).toMatchObject({ size: 4 })
  })

  it('does not download a different owner image or expose an invalid storage reference', async () => {
    expect(await createOwnedPropertyImagePreview(imageSource(otherOwnerId), ownerId)).toBeNull()
    expect(await createOwnedPropertyImagePreview('https://untrusted.example/storage/v1/object/public/property_images/' + ownerId + '/' + photoId + '.webp', ownerId)).toBeNull()
    expect(mocks.download).not.toHaveBeenCalled()
  })

  it('returns no preview when Storage fails or the file is not a bounded WebP', async () => {
    const unavailable = Object.assign(new Error('storage unavailable'), { status: 503 })
    mocks.download
      .mockResolvedValueOnce({ data: null, error: unavailable })
      .mockResolvedValueOnce({ data: null, error: unavailable })
    expect(await createOwnedPropertyImagePreview(imageSource(), ownerId)).toBeNull()

    mocks.download.mockResolvedValueOnce({ data: new Blob(['not webp'], { type: 'image/png' }), error: null })
    expect(await createOwnedPropertyImagePreview(imageSource(), ownerId)).toBeNull()
  })

  it('downloads only the owner cover through authenticated Storage and sets a temporary preview', async () => {
    const previewUrl = 'blob:private-cover'
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue(previewUrl)
    const [result] = await createOwnedPropertyCoverPreviews([{
      id: 'property-1', user_id: ownerId, cover_image: imageSource(),
    }], ownerId)

    expect(mocks.download).toHaveBeenCalledWith(`${ownerId}/${photoId}.webp`)
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ cover_image: expect.stringMatching(/^data:image\/svg\+xml,/), cover_preview_url: previewUrl })
  })

  it('retries a transient Storage failure once and then shows the private cover', async () => {
    const previewUrl = 'blob:retried-private-cover'
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(previewUrl)
    mocks.download
      .mockResolvedValueOnce({ data: null, error: Object.assign(new Error('temporary failure'), { status: 503 }) })
      .mockResolvedValueOnce({ data: new Blob(['webp'], { type: 'image/webp' }), error: null })

    const [result] = await createOwnedPropertyCoverPreviews([{
      id: 'property-retry', user_id: ownerId, cover_image: imageSource(),
    }], ownerId)

    expect(mocks.download).toHaveBeenCalledTimes(2)
    expect(result?.cover_preview_url).toBe(previewUrl)
  })

  it('does not retry a denied private cover download', async () => {
    mocks.download.mockResolvedValueOnce({ data: null, error: Object.assign(new Error('denied'), { status: 403 }) })

    const [result] = await createOwnedPropertyCoverPreviews([{
      id: 'property-denied', user_id: ownerId, cover_image: imageSource(),
    }], ownerId)

    expect(mocks.download).toHaveBeenCalledOnce()
    expect(result?.cover_preview_url).toBeUndefined()
  })

  it('does not request another owner image and uses a safe placeholder', async () => {
    const [result] = await createOwnedPropertyCoverPreviews([{
      id: 'property-1', user_id: ownerId,
      cover_image: imageSource(otherOwnerId),
    }], ownerId)

    expect(mocks.download).not.toHaveBeenCalled()
    expect(result?.cover_image).toMatch(/^data:image\/svg\+xml,/)
  })

  it('preserves external covers and falls back cleanly when private Storage fails', async () => {
    const external = 'https://images.unsplash.com/photo-example'
    const [publicResult] = await createOwnedPropertyCoverPreviews([{
      id: 'property-public', user_id: ownerId, cover_image: external,
    }], ownerId)
    expect(publicResult?.cover_image).toBe(external)
    expect(mocks.download).not.toHaveBeenCalled()

    const unavailable = Object.assign(new Error('storage unavailable'), { status: 503 })
    mocks.download
      .mockResolvedValueOnce({ data: null, error: unavailable })
      .mockResolvedValueOnce({ data: null, error: unavailable })
    const [privateResult] = await createOwnedPropertyCoverPreviews([{
      id: 'property-private', user_id: ownerId, cover_image: imageSource(),
    }], ownerId)
    expect(privateResult?.cover_image).toMatch(/^data:image\/svg\+xml,/)
    expect(privateResult?.cover_preview_url).toBeUndefined()
  })

  it('revokes temporary object URLs when the card list is replaced', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    revokePrivateImagePreviewUrls([
      { id: 'a', user_id: ownerId, cover_image: null, cover_preview_url: 'blob:cover' },
      { id: 'b', user_id: ownerId, cover_image: null, cover_preview_url: 'blob:cover' },
    ])
    expect(revoke).toHaveBeenCalledTimes(1)
    expect(revoke).toHaveBeenCalledWith('blob:cover')
  })
})
