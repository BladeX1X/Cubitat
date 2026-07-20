const DEFAULT_TURNSTILE_VERIFY_URL = 'https://turnstile-siteverify-cubitat.pochiprats18.workers.dev'
const MAX_REQUEST_BYTES = 16 * 1024
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface PublicSubmissionEnv {
  VITE_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  TURNSTILE_VERIFY_URL?: string
}

type TurnstileAction = 'contact-owner' | 'report-property'

type TurnstileResult = {
  success?: boolean
  hostname?: string
  action?: string
  'error-codes'?: string[]
}

type ContactPayload = {
  turnstile_token?: unknown
  property_id?: unknown
  contact_name?: unknown
  contact_phone?: unknown
  message?: unknown
}

type ReportPayload = {
  turnstile_token?: unknown
  property_id?: unknown
  reason?: unknown
  description?: unknown
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

function normalizedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function validLength(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max
}

async function parseJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  if (!request.headers.get('content-type')?.includes('application/json')) return null

  const declaredLength = Number(request.headers.get('content-length') || 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) return null

  const rawBody = await request.text()
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) return null

  try {
    const parsed = JSON.parse(rawBody)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

async function verifyTurnstile(
  request: Request,
  env: PublicSubmissionEnv,
  token: string,
  expectedAction: TurnstileAction,
): Promise<'valid' | 'invalid' | 'unavailable'> {
  if (!validLength(token, 1, 2048)) return 'invalid'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)

  try {
    const response = await fetch(env.TURNSTILE_VERIFY_URL || DEFAULT_TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        remoteip: request.headers.get('CF-Connecting-IP') || undefined,
        idempotency_key: crypto.randomUUID(),
      }),
      signal: controller.signal,
    })

    if (!response.ok) return 'unavailable'

    const result = await response.json() as TurnstileResult
    const requestHostname = new URL(request.url).hostname
    if (result.success !== true) return 'invalid'
    if (result.action !== expectedAction) return 'invalid'
    if (result.hostname !== requestHostname) return 'invalid'

    return 'valid'
  } catch {
    return 'unavailable'
  } finally {
    clearTimeout(timeout)
  }
}

async function callTrustedRpc(env: PublicSubmissionEnv, rpcName: string, body: unknown): Promise<boolean> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return false

  const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })

  return response.ok
}

function turnstileFailure(result: 'invalid' | 'unavailable'): Response {
  return result === 'invalid'
    ? json({ error: 'La verificacion de seguridad no es valida.' }, 400)
    : json({ error: 'La verificacion de seguridad no esta disponible.' }, 503)
}

export async function handlePublicContactSubmission(
  request: Request,
  env: PublicSubmissionEnv,
): Promise<Response> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'El formulario no esta disponible.' }, 503)
  }

  const body = await parseJsonBody(request) as ContactPayload | null
  if (!body) return json({ error: 'Solicitud no valida.' }, 400)

  const token = normalizedString(body.turnstile_token)
  const propertyId = normalizedString(body.property_id)
  const contactName = normalizedString(body.contact_name)
  const contactPhone = normalizedString(body.contact_phone)
  const message = normalizedString(body.message)

  if (!UUID_PATTERN.test(propertyId)
    || !validLength(contactName, 2, 120)
    || !validLength(contactPhone, 6, 40)
    || !validLength(message, 5, 2000)) {
    return json({ error: 'Los datos del formulario no son validos.' }, 400)
  }

  const turnstile = await verifyTurnstile(request, env, token, 'contact-owner')
  if (turnstile !== 'valid') return turnstileFailure(turnstile)

  const inserted = await callTrustedRpc(env, 'submit_public_contact_trusted', {
    p_property_id: propertyId,
    p_contact_name: contactName,
    p_contact_phone: contactPhone,
    p_message: message,
  })

  return inserted
    ? json({ ok: true }, 201)
    : json({ error: 'No fue posible registrar la consulta.' }, 503)
}

export async function handlePublicReportSubmission(
  request: Request,
  env: PublicSubmissionEnv,
  reporterId: string | null,
): Promise<Response> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'El formulario no esta disponible.' }, 503)
  }

  const body = await parseJsonBody(request) as ReportPayload | null
  if (!body) return json({ error: 'Solicitud no valida.' }, 400)

  const token = normalizedString(body.turnstile_token)
  const propertyId = normalizedString(body.property_id)
  const reason = normalizedString(body.reason)
  const description = normalizedString(body.description)

  if (!UUID_PATTERN.test(propertyId)
    || !validLength(reason, 2, 80)
    || description.length > 2000) {
    return json({ error: 'Los datos del formulario no son validos.' }, 400)
  }

  const turnstile = await verifyTurnstile(request, env, token, 'report-property')
  if (turnstile !== 'valid') return turnstileFailure(turnstile)

  const inserted = await callTrustedRpc(env, 'submit_public_report_trusted', {
    p_property_id: propertyId,
    p_reporter_id: reporterId,
    p_reason: reason,
    p_description: description || null,
  })

  return inserted
    ? json({ ok: true }, 201)
    : json({ error: 'No fue posible registrar el reporte.' }, 503)
}
