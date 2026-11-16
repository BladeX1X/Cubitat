import { readBoundedBytes } from './boundedJson.js'

export const MAX_PROPERTY_IMAGE_BYTES = 5 * 1024 * 1024
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface PropertyImageUploadEnv {
  VITE_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function isWebp(bytes: Uint8Array): boolean {
  return bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
}

export async function handlePropertyImageUpload(
  request: Request,
  env: PropertyImageUploadEnv,
  ownerId: string,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' })
  if (!UUID_PATTERN.test(ownerId)) return json(401, { error: 'Unauthorized' })
  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json(503, { error: 'Image upload unavailable' })
  if (request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'image/webp') {
    return json(415, { error: 'Unsupported image format' })
  }

  const bounded = await readBoundedBytes(request, MAX_PROPERTY_IMAGE_BYTES, 15_000)
  if (!bounded.ok) {
    const message = bounded.status === 413 ? 'Image is too large'
      : bounded.status === 408 ? 'Image upload timed out'
        : 'Invalid image upload'
    return json(bounded.status, { error: message })
  }
  if (!isWebp(bounded.value)) return json(415, { error: 'Unsupported image format' })

  const path = `${ownerId.toLowerCase()}/${crypto.randomUUID()}.webp`
  const supabaseUrl = env.VITE_SUPABASE_URL.replace(/\/$/, '')
  const uploadBody = bounded.value.buffer.slice(
    bounded.value.byteOffset,
    bounded.value.byteOffset + bounded.value.byteLength,
  ) as ArrayBuffer
  try {
    const response = await fetchFn(`${supabaseUrl}/storage/v1/object/property_images/${path}`, {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=3600',
        'x-upsert': 'false',
      },
      body: uploadBody,
    })
    if (!response.ok) {
      if (response.body) void response.body.cancel().catch(() => undefined)
      return json(503, { error: 'Image upload unavailable' })
    }
    return json(201, { path })
  } catch {
    return json(503, { error: 'Image upload unavailable' })
  }
}
