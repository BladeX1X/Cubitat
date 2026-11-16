import { describe, expect, it, vi } from 'vitest'
import { handlePropertyImageUpload, MAX_PROPERTY_IMAGE_BYTES } from './property-image-uploads'

const ownerId = '11111111-1111-4111-8111-111111111111'
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
const env = { VITE_SUPABASE_URL: 'https://example.supabase.co/', SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret' }

describe('property image upload gateway', () => {
  it('stores validated WebP bytes under the authenticated owner folder', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }))
    const request = new Request('https://app.example/api/property-images/upload', {
      method: 'POST', headers: { 'Content-Type': 'image/webp' }, body: webp,
    })

    const response = await handlePropertyImageUpload(request, env, ownerId, fetchMock)

    expect(response.status).toBe(201)
    const result = await response.json() as { path: string }
    expect(result.path).toMatch(new RegExp(`^${ownerId}/[0-9a-f-]+\\.webp$`, 'i'))
    expect(fetchMock).toHaveBeenCalledWith(
      `https://example.supabase.co/storage/v1/object/property_images/${result.path}`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'image/webp',
          'x-upsert': 'false',
        }),
        body: webp.buffer.slice(webp.byteOffset, webp.byteOffset + webp.byteLength),
      }),
    )
  })

  it('rejects unauthenticated owners, non-WebP bodies, oversized bodies, and missing server credentials', async () => {
    const request = (contentType = 'image/webp', body: BodyInit = webp) => new Request('https://app.example/upload', {
      method: 'POST', headers: { 'Content-Type': contentType }, body,
    })
    const fetchMock = vi.fn()

    expect((await handlePropertyImageUpload(request(), env, 'not-a-user-id', fetchMock)).status).toBe(401)
    expect((await handlePropertyImageUpload(request('image/png'), env, ownerId, fetchMock)).status).toBe(415)
    expect((await handlePropertyImageUpload(request('image/webp', new Uint8Array(MAX_PROPERTY_IMAGE_BYTES + 1)), env, ownerId, fetchMock)).status).toBe(413)
    expect((await handlePropertyImageUpload(request(), { VITE_SUPABASE_URL: env.VITE_SUPABASE_URL }, ownerId, fetchMock)).status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a claimed WebP with a different file signature and hides Storage failures', async () => {
    const badSignature = new Uint8Array(12)
    const invalid = await handlePropertyImageUpload(new Request('https://app.example/upload', {
      method: 'POST', headers: { 'Content-Type': 'image/webp' }, body: badSignature,
    }), env, ownerId)
    expect(invalid.status).toBe(415)

    const failed = await handlePropertyImageUpload(new Request('https://app.example/upload', {
      method: 'POST', headers: { 'Content-Type': 'image/webp' }, body: webp,
    }), env, ownerId, vi.fn().mockResolvedValue(new Response(null, { status: 403 })))
    expect(failed.status).toBe(503)
    expect(await failed.json()).toEqual({ error: 'Image upload unavailable' })
  })
})
