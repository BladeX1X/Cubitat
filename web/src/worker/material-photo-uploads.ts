import { readBoundedBytes } from './boundedJson.js'

export const MAX_MATERIAL_PHOTO_BYTES = 5 * 1024 * 1024
export const MAX_MATERIAL_PHOTO_OBJECTS_PER_LISTING = 20
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface MaterialPhotoUploadEnv {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

function json(status: number, body: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
  })
}

function isWebp(bytes: Uint8Array): boolean {
  return bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
}

/** Uploads one already optimized photo through the authenticated DEV gateway. */
export async function handleMaterialPhotoUpload(
  request: Request,
  env: MaterialPhotoUploadEnv,
  ownerId: string,
  listingId: string,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })
  if (!UUID.test(ownerId) || !UUID.test(listingId)) return json(401, { error: 'Unauthorized' })
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) return json(503, { error: 'Photo upload unavailable' })
  if (request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'image/webp') {
    return json(415, { error: 'Unsupported image format' })
  }

  const bounded = await readBoundedBytes(request, MAX_MATERIAL_PHOTO_BYTES, 15_000)
  if (!bounded.ok) {
    const message = bounded.status === 413 ? 'Image is too large'
      : bounded.status === 408 ? 'Image upload timed out'
        : 'Invalid image upload'
    return json(bounded.status, { error: message })
  }
  if (!isWebp(bounded.value)) return json(415, { error: 'Unsupported image format' })

  const supabaseUrl = env.VITE_SUPABASE_URL.replace(/\/+$/, '')
  const userAuthorization = request.headers.get('Authorization')
  if (!userAuthorization) return json(401, { error: 'Unauthorized' })
  const ownershipHeaders = {
    apikey: env.VITE_SUPABASE_ANON_KEY,
    Authorization: userAuthorization,
    'Content-Type': 'application/json',
  }
  const serviceHeaders = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  }
  try {
    // `owner_id` is deliberately not selectable through the Data API. Validate
    // ownership and listing state with the caller's JWT through the narrow
    // SECURITY DEFINER RPC, then use service_role only for the private object.
    const listingResponse = await fetchFn(`${supabaseUrl}/rest/v1/rpc/can_upload_material_photo`, {
      method: 'POST',
      headers: ownershipHeaders,
      body: JSON.stringify({ p_listing_id: listingId }),
    })
    if (!listingResponse.ok) return json(503, { error: 'Photo upload unavailable' })
    const canUpload: unknown = await listingResponse.json()
    if (canUpload !== true) return json(404, { error: 'Listing unavailable' })

    // The trusted service-role upload bypasses Storage RLS. Reapply the
    // per-listing quota here before writing an object.
    const photoListResponse = await fetchFn(`${supabaseUrl}/storage/v1/object/list/material-listings`, {
      method: 'POST',
      headers: { ...serviceHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: `${ownerId.toLowerCase()}/${listingId.toLowerCase()}`, limit: MAX_MATERIAL_PHOTO_OBJECTS_PER_LISTING, offset: 0 }),
    })
    if (!photoListResponse.ok) return json(503, { error: 'Photo upload unavailable' })
    const existingPhotos: unknown = await photoListResponse.json()
    if (!Array.isArray(existingPhotos)) return json(503, { error: 'Photo upload unavailable' })
    if (existingPhotos.length >= MAX_MATERIAL_PHOTO_OBJECTS_PER_LISTING) {
      return json(409, { error: 'Photo limit reached' })
    }

    const path = `${ownerId.toLowerCase()}/${listingId.toLowerCase()}/${crypto.randomUUID()}.webp`
    const body = bounded.value.buffer.slice(
      bounded.value.byteOffset,
      bounded.value.byteOffset + bounded.value.byteLength,
    ) as ArrayBuffer
    const uploadResponse = await fetchFn(`${supabaseUrl}/storage/v1/object/material-listings/${path}`, {
      method: 'POST',
      headers: {
        ...serviceHeaders,
        'Content-Type': 'image/webp',
        'Cache-Control': '60',
        'x-upsert': 'false',
      },
      body,
    })
    if (!uploadResponse.ok) {
      if (uploadResponse.body) void uploadResponse.body.cancel().catch(() => undefined)
      return json(503, { error: 'Photo upload unavailable' })
    }
    return json(201, { path })
  } catch {
    return json(503, { error: 'Photo upload unavailable' })
  }
}
