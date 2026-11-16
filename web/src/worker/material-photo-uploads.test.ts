import { describe, expect, it, vi } from 'vitest'
import { handleMaterialPhotoUpload, MAX_MATERIAL_PHOTO_BYTES, MAX_MATERIAL_PHOTO_OBJECTS_PER_LISTING } from './material-photo-uploads'

const ownerId = '11111111-1111-4111-8111-111111111111'
const listingId = '22222222-2222-4222-8222-222222222222'
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
const env = { VITE_SUPABASE_URL: 'https://example.supabase.co/', VITE_SUPABASE_ANON_KEY: 'anon-public-key', SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret' }
const request = (body: BodyInit = webp, type = 'image/webp') => new Request('https://app.example/upload', {
  method: 'POST', headers: { 'Content-Type': type, Authorization: 'Bearer user-session-token' }, body,
})

describe('material photo upload gateway', () => {
  it('checks listing ownership before storing raw WebP bytes with the service role', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json(true))
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(new Response(null, { status: 201 }))

    const response = await handleMaterialPhotoUpload(request(), env, ownerId, listingId, fetchMock)

    expect(response.status).toBe(201)
    const result = await response.json() as { path: string }
    expect(result.path).toMatch(new RegExp(`^${ownerId}/${listingId}/[0-9a-f-]+\\.webp$`, 'i'))
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/rest/v1/rpc/can_upload_material_photo')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ p_listing_id: listingId }),
      headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: 'Bearer user-session-token' },
    })
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/storage/v1/object/list/material-listings')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ prefix: `${ownerId}/${listingId}`, limit: MAX_MATERIAL_PHOTO_OBJECTS_PER_LISTING, offset: 0 }),
      headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    })
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'POST', body: webp.buffer,
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'image/webp', 'Cache-Control': '60', 'x-upsert': 'false',
      },
    })
  })

  it('does not upload when the listing is missing, foreign, or archived', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([]))
    const response = await handleMaterialPhotoUpload(request(), env, ownerId, listingId, fetchMock)
    expect(response.status).toBe(404)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('enforces the per-listing photo quota after bypassing Storage RLS', async () => {
    const fullListing = vi.fn()
      .mockResolvedValueOnce(Response.json(true))
      .mockResolvedValueOnce(Response.json(Array.from({ length: MAX_MATERIAL_PHOTO_OBJECTS_PER_LISTING }, (_, index) => ({ name: `${index}.webp` }))))
    const response = await handleMaterialPhotoUpload(request(), env, ownerId, listingId, fullListing)

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'Photo limit reached' })
    expect(fullListing).toHaveBeenCalledTimes(2)
  })

  it('rejects invalid identities, content types, signatures, oversized bodies and missing credentials', async () => {
    const fetchMock = vi.fn()
    expect((await handleMaterialPhotoUpload(request(), env, 'not-uuid', listingId, fetchMock)).status).toBe(401)
    expect((await handleMaterialPhotoUpload(request(webp, 'image/png'), env, ownerId, listingId, fetchMock)).status).toBe(415)
    expect((await handleMaterialPhotoUpload(request(new Uint8Array(12)), env, ownerId, listingId, fetchMock)).status).toBe(415)
    expect((await handleMaterialPhotoUpload(request(new Uint8Array(MAX_MATERIAL_PHOTO_BYTES + 1)), env, ownerId, listingId, fetchMock)).status).toBe(413)
    expect((await handleMaterialPhotoUpload(request(), { VITE_SUPABASE_URL: env.VITE_SUPABASE_URL }, ownerId, listingId, fetchMock)).status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('hides upstream lookup and Storage errors from the client', async () => {
    const lookupFailure = vi.fn().mockResolvedValue(new Response(null, { status: 500 }))
    expect((await handleMaterialPhotoUpload(request(), env, ownerId, listingId, lookupFailure)).status).toBe(503)
    const listFailure = vi.fn()
      .mockResolvedValueOnce(Response.json(true))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
    expect((await handleMaterialPhotoUpload(request(), env, ownerId, listingId, listFailure)).status).toBe(503)
    const uploadFailure = vi.fn()
      .mockResolvedValueOnce(Response.json(true))
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
    expect((await handleMaterialPhotoUpload(request(), env, ownerId, listingId, uploadFailure)).status).toBe(503)
  })
})
