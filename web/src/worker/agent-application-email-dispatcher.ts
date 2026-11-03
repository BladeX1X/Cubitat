import { logWorkerEvent } from './logger'

const BUCKET = 'agent_application_documents'
const SIGNED_URL_TTL_SECONDS = 600
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface AgentApplicationEmailEnv {
  PHASE3_ENABLED?: string
  VITE_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  RESEND_API_KEY?: string
  ALERT_EMAIL_FROM?: string
  AGENT_APPLICATION_EMAIL_TO?: string
}

interface ClaimedAgentApplicationEmail {
  id: string
  application_id: string
  user_id: string
  province: string
  education_title: string
  cv_path: string
  diploma_path: string
  created_at: string
  attempts: number
}

export interface AgentApplicationEmailSummary {
  claimed: number
  sent: number
  failed: number
}

type FetchFn = typeof fetch

const emptySummary = (): AgentApplicationEmailSummary => ({ claimed: 0, sent: 0, failed: 0 })

function serviceHeaders(key: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}

function validClaim(value: unknown): value is ClaimedAgentApplicationEmail {
  if (!value || typeof value !== 'object') return false
  const row = value as Partial<ClaimedAgentApplicationEmail>
  if (typeof row.id !== 'string' || !UUID_PATTERN.test(row.id)
    || typeof row.application_id !== 'string' || !UUID_PATTERN.test(row.application_id)
    || typeof row.user_id !== 'string' || !UUID_PATTERN.test(row.user_id)
    || typeof row.province !== 'string' || row.province.length > 80
    || typeof row.education_title !== 'string' || row.education_title.length > 160
    || typeof row.created_at !== 'string' || !Number.isFinite(Date.parse(row.created_at))
    || typeof row.attempts !== 'number') return false

  const ownedPath = new RegExp(`^${row.user_id}/${row.application_id}/(?:cv|diploma)-[0-9a-f-]{36}\\.(?:pdf|jpg|png)$`, 'i')
  return typeof row.cv_path === 'string' && ownedPath.test(row.cv_path)
    && typeof row.diploma_path === 'string' && ownedPath.test(row.diploma_path)
    && row.cv_path !== row.diploma_path
}

function safeSignedUrl(value: unknown, baseUrl: string): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  try {
    const resolved = new URL(value, baseUrl)
    const base = new URL(baseUrl)
    if (resolved.origin !== base.origin
      || !resolved.pathname.startsWith(`/storage/v1/object/sign/${BUCKET}/`)
      || !resolved.searchParams.has('token')) return null
    return resolved.toString()
  } catch {
    return null
  }
}

async function createSignedUrl(path: string, env: AgentApplicationEmailEnv, fetchFn: FetchFn): Promise<string> {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const response = await fetchFn(
    `${env.VITE_SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${encodedPath}`,
    {
      method: 'POST',
      headers: serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY!),
      body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }),
    },
  )
  if (!response.ok) throw new Error('document_signing_failed')
  const payload = await response.json() as { signedURL?: unknown }
  const url = safeSignedUrl(payload.signedURL, env.VITE_SUPABASE_URL)
  if (!url) throw new Error('invalid_signed_document_url')
  return url
}

async function updateOutbox(
  env: AgentApplicationEmailEnv,
  outboxId: string,
  action: 'complete_agent_application_email' | 'release_agent_application_email',
  fetchFn: FetchFn,
): Promise<boolean> {
  const response = await fetchFn(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/${action}`, {
    method: 'POST',
    headers: serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY!),
    body: JSON.stringify({ p_outbox_id: outboxId, p_error_code: action.startsWith('release') ? 'delivery_failed' : undefined }),
  })
  return response.ok
}

/** Sends the admin an application notice with 10-minute private document links; documents are never attached. */
export async function dispatchPendingAgentApplicationEmails(
  env: AgentApplicationEmailEnv,
  fetchFn: FetchFn = fetch,
): Promise<AgentApplicationEmailSummary> {
  const summary = emptySummary()
  if (env.PHASE3_ENABLED !== 'true') return summary

  const recipient = env.AGENT_APPLICATION_EMAIL_TO?.trim()
  const sender = env.ALERT_EMAIL_FROM?.trim()
  if (!env.VITE_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY
    || !recipient || recipient.length > 320 || /[\r\n]/.test(recipient)
    || !sender || sender.length > 200 || /[\r\n]/.test(sender)) {
    logWorkerEvent('warn', 'agent_application_email_skipped', { reason: 'missing_configuration' })
    return summary
  }

  let claimed: ClaimedAgentApplicationEmail[]
  try {
    const response = await fetchFn(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/claim_pending_agent_application_emails`, {
      method: 'POST',
      headers: serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
      body: JSON.stringify({ p_limit: 10 }),
    })
    if (!response.ok) {
      logWorkerEvent('warn', 'agent_application_email_claim_failed', { status: response.status })
      return summary
    }
    const body: unknown = await response.json()
    if (!Array.isArray(body)) {
      claimed = []
    } else {
      claimed = body.filter(validClaim)
      // Release malformed rows immediately when their outbox id is still usable.
      // Otherwise they would stay locked until the stale-claim timeout.
      const malformedIds = body
        .filter((row) => !validClaim(row) && row && typeof row === 'object')
        .map((row) => (row as { id?: unknown }).id)
        .filter((id): id is string => typeof id === 'string' && UUID_PATTERN.test(id))
      await Promise.all(malformedIds.map(async (id) => {
        try {
          const released = await updateOutbox(env, id, 'release_agent_application_email', fetchFn)
          if (!released) logWorkerEvent('error', 'agent_application_email_release_failed')
        } catch {
          logWorkerEvent('error', 'agent_application_email_release_failed')
        }
      }))
    }
  } catch {
    logWorkerEvent('warn', 'agent_application_email_claim_failed', { reason: 'network_unavailable' })
    return summary
  }

  summary.claimed = claimed.length
  for (const application of claimed) {
    try {
      const [cvUrl, diplomaUrl] = await Promise.all([
        createSignedUrl(application.cv_path, env, fetchFn),
        createSignedUrl(application.diploma_path, env, fetchFn),
      ])
      const resendResponse = await fetchFn('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Idempotency-Key': `cubitat-agent-application/${application.id}`,
        },
        body: JSON.stringify({
          from: sender,
          to: [recipient],
          subject: 'Nueva postulación para agente — Cubitat',
          html: [
            '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">',
            '<h2>Nueva postulación para agente</h2>',
            `<p><strong>Provincia:</strong> ${escapeHtml(application.province)}</p>`,
            `<p><strong>Formación:</strong> ${escapeHtml(application.education_title)}</p>`,
            `<p><strong>Recibida:</strong> ${escapeHtml(new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(application.created_at)))} UTC</p>`,
            '<p>Los documentos se comparten por enlaces privados que vencen en 10 minutos. No reenvíes este mensaje.</p>',
            `<p><a href="${escapeHtml(cvUrl)}">Abrir currículum</a></p>`,
            `<p><a href="${escapeHtml(diplomaUrl)}">Abrir título</a></p>`,
            '</div>',
          ].join(''),
        }),
      })
      if (!resendResponse.ok) throw new Error('email_provider_failed')

      const completed = await updateOutbox(env, application.id, 'complete_agent_application_email', fetchFn)
      if (!completed) throw new Error('email_outbox_completion_failed')
      summary.sent += 1
    } catch {
      summary.failed += 1
      try {
        const released = await updateOutbox(env, application.id, 'release_agent_application_email', fetchFn)
        if (!released) logWorkerEvent('error', 'agent_application_email_release_failed')
      } catch {
        logWorkerEvent('error', 'agent_application_email_release_failed')
      }
      logWorkerEvent('warn', 'agent_application_email_delivery_failed')
    }
  }
  return summary
}
