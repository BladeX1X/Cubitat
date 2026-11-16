import { describe, expect, it, vi } from 'vitest'
import { uploadMaterialPhoto } from './uploadMaterialPhoto'

const ownerId = '11111111-1111-4111-8111-111111111111'
const listingId = '22222222-2222-4222-8222-222222222222'
const path = `${ownerId}/${listingId}/33333333-3333-4333-8333-333333333333.webp`
const file = new File(['webp'], 'photo.webp', { type: 'image/webp' })

describe('uploadMaterialPhoto', () => {
  it('posts optimized bytes to the authenticated gateway and accepts only the same owner and listing path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ path }, { status: 201 }))

    await expect(uploadMaterialPhoto(file, ownerId, listingId, 'access-token', fetchMock)).resolves.toBe(path)

    expect(fetchMock).toHaveBeenCalledWith(`/api/material-photos/${listingId}/upload`, {
      method: 'POST',
      headers: { Authorization: 'Bearer access-token', 'Content-Type': 'image/webp' },
      body: file,
    })
  })

  it('rejects missing sessions, non-WebP files, server failures, and invalid returned paths', async () => {
    const fetchMock = vi.fn()
    await expect(uploadMaterialPhoto(file, ownerId, listingId, '', fetchMock)).rejects.toThrow('AUTH_REQUIRED')
    await expect(uploadMaterialPhoto(new File(['x'], 'photo.png', { type: 'image/png' }), ownerId, listingId, 'token', fetchMock))
      .rejects.toThrow('MATERIAL_PHOTO_INVALID_TYPE')
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }))
    await expect(uploadMaterialPhoto(file, ownerId, listingId, 'token', fetchMock)).rejects.toThrow('MATERIAL_PHOTO_UPLOAD_FAILED')
    fetchMock.mockResolvedValueOnce(Response.json({ path: `${ownerId}/${listingId}/other.webp` }))
    await expect(uploadMaterialPhoto(file, ownerId, listingId, 'token', fetchMock)).rejects.toThrow('MATERIAL_PHOTO_UPLOAD_FAILED')
  })
})
