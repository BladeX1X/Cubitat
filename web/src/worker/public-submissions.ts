import { normalizePhoneForStorage, validatePhone } from '../shared/lib/phone'
import { readBoundedJsonObject } from './boundedJson.js'

const DEFAULT_TURNSTILE_VERIFY_URL = 'https://turnstile-siteverify-cubitat.pochiprats18.workers.dev'
const MAX_REQUEST_BYTES = 16 * 1024
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface PublicSubmissionEnv {
  VITE_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  TURNSTILE_VERIFY_URL?: string
  TURNSTILE_VERIFY?: {
    fetch(input: string | Request, init?: RequestInit): Promise<Response>
  }
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
    const verifyRequest = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        remoteip: request.headers.get('CF-Connecting-IP') || undefined,
        idempotency_key: crypto.randomUUID(),
      }),
      signal: controller.signal,
    }
    const response = await (env.TURNSTILE_VERIFY
      ? env.TURNSTILE_VERIFY.fetch('https://turnstile-siteverify-cubitat/', verifyRequest)
      : fetch(env.TURNSTILE_VERIFY_URL || DEFAULT_TURNSTILE_VERIFY_URL, verifyRequest))

    if (!response.ok) {
      console.warn('public_submission_turnstile_unavailable', {
        status: response.status,
        action: expectedAction,
      })
      return 'unavailable'
    }

    const result = await response.json() as TurnstileResult
    const requestHostname = new URL(request.url).hostname
    if (result.success !== true) {
      console.warn('public_submission_turnstile_invalid', {
        action: expectedAction,
        reason: 'success_false',
      })
      return 'invalid'
    }
    if (result.action !== expectedAction) {
      console.warn('public_submission_turnstile_invalid', {
        action: expectedAction,
        reason: 'action_mismatch',
      })
      return 'invalid'
    }
    if (result.hostname !== requestHostname) {
      console.warn('public_submission_turnstile_invalid', {
        action: expectedAction,
        reason: 'hostname_mismatch',
      })
      return 'invalid'
    }

    return 'valid'
  } catch {
    console.warn('public_submission_turnstile_unavailable', {
      action: expectedAction,
      reason: 'request_failed',
    })
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

  if (!response.ok) {
    console.warn('public_submission_rpc_failed', {
      rpcName,
      status: response.status,
    })
    return false
  }

  return true
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

  const parsed = await readBoundedJsonObject<ContactPayload>(request, MAX_REQUEST_BYTES)
  if (!parsed.ok) {
    const message = parsed.status === 413 ? 'Solicitud demasiado grande.'
      : parsed.status === 408 ? 'La solicitud tardó demasiado.'
        : 'Solicitud no valida.'
    return json({ error: message }, parsed.status)
  }
  const body = parsed.value

  const token = normalizedString(body.turnstile_token)
  const propertyId = normalizedString(body.property_id)
  const contactName = normalizedString(body.contact_name)
  const contactPhone = normalizedString(body.contact_phone)
  const normalizedContactPhone = normalizePhoneForStorage(contactPhone)
  const message = normalizedString(body.message)

  if (!UUID_PATTERN.test(propertyId)
    || !validLength(contactName, 2, 120)
    || !validatePhone(contactPhone)
    || !validLength(message, 5, 2000)) {
    return json({ error: 'Los datos del formulario no son validos.' }, 400)
  }

  const turnstile = await verifyTurnstile(request, env, token, 'contact-owner')
  if (turnstile !== 'valid') return turnstileFailure(turnstile)

  const inserted = await callTrustedRpc(env, 'submit_public_contact_trusted', {
    p_property_id: propertyId,
    p_contact_name: contactName,
    p_contact_phone: normalizedContactPhone,
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

  const parsed = await readBoundedJsonObject<ReportPayload>(request, MAX_REQUEST_BYTES)
  if (!parsed.ok) {
    const message = parsed.status === 413 ? 'Solicitud demasiado grande.'
      : parsed.status === 408 ? 'La solicitud tardó demasiado.'
        : 'Solicitud no valida.'
    return json({ error: message }, parsed.status)
  }
  const body = parsed.value

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
