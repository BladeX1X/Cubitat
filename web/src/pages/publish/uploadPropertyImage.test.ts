import { describe, expect, it, vi } from 'vitest'
import { uploadPropertyImage } from './uploadPropertyImage'

describe('uploadPropertyImage', () => {
  it('sends the optimized image and bearer token to the Worker', async () => {
    const image = new Blob(['webp-bytes'], { type: 'image/webp' })
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      path: '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp',
    }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(uploadPropertyImage(image, 'user-access-token')).resolves.toBe(
      '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.webp',
    )
    expect(fetchMock).toHaveBeenCalledWith('/api/property-images/upload', expect.objectContaining({
      method: 'POST',
      headers: { Authorization: 'Bearer user-access-token', 'Content-Type': 'image/webp' },
      body: image,
    }))
  })

  it('rejects a missing session, failed response, and malformed owner path', async () => {
    const image = new Blob(['webp-bytes'], { type: 'image/webp' })
    await expect(uploadPropertyImage(image, '')).rejects.toThrow('PROPERTY_IMAGE_SESSION_REQUIRED')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))
    await expect(uploadPropertyImage(image, 'token')).rejects.toThrow('PROPERTY_IMAGE_UPLOAD_HTTP_401')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ path: 'other/file.webp' }), { status: 201 })))
    await expect(uploadPropertyImage(image, 'token')).rejects.toThrow('PROPERTY_IMAGE_UPLOAD_INVALID_RESPONSE')
  })
})
