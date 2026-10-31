import { readBoundedJsonObject } from './boundedJson.js'

interface ContactMetricEnv {
  VITE_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  CONTACT_METRICS_SALT?: string
}

type FetchFn = typeof fetch

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

async function deriveViewerKey(request: Request, salt: string, now: Date): Promise<string> {
  const ip = request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || '127.0.0.1'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const day = now.toISOString().slice(0, 10)
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(salt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${ip}|${userAgent}|${day}`),
  )).slice(0, 16)
  digest[6] = (digest[6] & 0x0f) | 0x40
  digest[8] = (digest[8] & 0x3f) | 0x80
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export async function handleContactMetric(
  request: Request,
  env: ContactMetricEnv,
  fetchFn: FetchFn = fetch,
  now = new Date(),
): Promise<Response> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.CONTACT_METRICS_SALT) {
    return jsonResponse({ error: 'Contact metrics are not configured' }, 503)
  }

  const parsed = await readBoundedJsonObject<{ propertyId?: unknown; channel?: unknown }>(request, 1_024)
  if (!parsed.ok) {
    const message = parsed.status === 413 ? 'Payload too large'
      : parsed.status === 408 ? 'Request body timed out'
        : 'Invalid JSON'
    return jsonResponse({ error: message }, parsed.status)
  }
  const body = parsed.value

  if (typeof body.propertyId !== 'string' || !UUID_PATTERN.test(body.propertyId)) {
    return jsonResponse({ error: 'Invalid propertyId' }, 400)
  }
  if (body.channel !== 'phone' && body.channel !== 'whatsapp') {
    return jsonResponse({ error: 'Invalid channel' }, 400)
  }

  const viewerKey = await deriveViewerKey(request, env.CONTACT_METRICS_SALT, now)
  const response = await fetchFn(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/increment_contact_clicks`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_property_id: body.propertyId,
      p_channel: body.channel,
      p_viewer_key: viewerKey,
    }),
  })

  if (!response.ok) return jsonResponse({ error: 'Metric unavailable' }, 502)
  const rows = await response.json() as Array<{
    phone_clicks_count?: number | string
    whatsapp_clicks_count?: number | string
  }>
  const row = rows[0]
  if (!row) return jsonResponse({ error: 'Metric unavailable' }, 502)
  return jsonResponse(row)
}
