import { logWorkerEvent } from './logger'

export interface AlertEmailEnv {
  VITE_SUPABASE_URL: string
  PHASE2_ENABLED?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  RESEND_API_KEY?: string
  ALERT_EMAIL_PROVIDER_URL?: string
  ALERT_EMAIL_FROM?: string
  PUBLIC_SITE_URL?: string
}

interface PendingNotification {
  id: string
  user_id: string
  title: string
  message: string
  email_attempts: number | null
}

interface ProfileEmail {
  id: string
  email: string | null
}

export interface AlertDispatchSummary {
  scanned: number
  sent: number
  failed: number
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function serviceHeaders(key: string): HeadersInit {
  return {
    ...JSON_HEADERS,
    apikey: key,
    Authorization: `Bearer ${key}`,
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] ?? character)
}

async function updateDelivery(
  env: AlertEmailEnv,
  notification: PendingNotification,
  status: 'pending' | 'sent' | 'failed',
  fetchFn: typeof fetch,
): Promise<void> {
  const response = await fetchFn(
    `${env.VITE_SUPABASE_URL}/rest/v1/notifications?id=eq.${encodeURIComponent(notification.id)}`,
    {
      method: 'PATCH',
      headers: {
        ...serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY as string),
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        email_delivery_status: status,
        email_sent_at: status === 'sent' ? new Date().toISOString() : null,
      }),
    },
  )
  if (!response.ok) throw new Error('notification_delivery_update_failed')
}

export async function dispatchPendingAlertEmails(
  env: AlertEmailEnv,
  fetchFn: typeof fetch = fetch,
): Promise<AlertDispatchSummary> {
  const summary: AlertDispatchSummary = { scanned: 0, sent: 0, failed: 0 }
  if (env.PHASE2_ENABLED === 'false') {
    logWorkerEvent('warn', 'alert_email_dispatch_skipped', { reason: 'phase2_disabled' })
    return summary
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY || !env.PUBLIC_SITE_URL || !env.ALERT_EMAIL_FROM) {
    logWorkerEvent('warn', 'alert_email_dispatch_skipped', { reason: 'missing_configuration' })
    return summary
  }

  let notifications: PendingNotification[]
  let emailByUser: Map<string, string | null>
  try {
    const notificationsResponse = await fetchFn(
      `${env.VITE_SUPABASE_URL}/rest/v1/rpc/claim_pending_alert_emails`,
      {
        method: 'POST',
        headers: serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
        body: JSON.stringify({ p_limit: 50 }),
      },
    )
    if (!notificationsResponse.ok) {
      logWorkerEvent('error', 'alert_email_dispatch_failed', { source: 'service_role', status: notificationsResponse.status })
      return summary
    }

    notifications = await notificationsResponse.json() as PendingNotification[]
    summary.scanned = notifications.length
    if (notifications.length === 0) return summary

    const userIds = [...new Set(notifications.map(({ user_id }) => user_id))]
    const profilesResponse = await fetchFn(
      `${env.VITE_SUPABASE_URL}/rest/v1/profiles?select=id,email&id=in.(${userIds.map(encodeURIComponent).join(',')})`,
      { headers: serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY) },
    )
    if (!profilesResponse.ok) {
      logWorkerEvent('error', 'alert_email_dispatch_failed', { source: 'service_role', status: profilesResponse.status })
      return summary
    }
    const profiles = await profilesResponse.json() as ProfileEmail[]
    emailByUser = new Map(profiles.map(({ id, email }) => [id, email?.trim() || null]))
  } catch {
    logWorkerEvent('error', 'alert_email_dispatch_failed', { source: 'service_role', reason: 'network_unavailable' })
    return summary
  }

  const providerUrl = env.ALERT_EMAIL_PROVIDER_URL || 'https://api.resend.com/emails'
  const sender = env.ALERT_EMAIL_FROM
  const publicSiteUrl = env.PUBLIC_SITE_URL.replace(/\/+$/, '')

  for (const notification of notifications) {
    const recipient = emailByUser.get(notification.user_id)
    const attempts = notification.email_attempts ?? 1
    try {
      if (!recipient) throw new Error('recipient_unavailable')
      const resendResponse = await fetchFn(providerUrl, {
        method: 'POST',
        headers: {
          ...JSON_HEADERS,
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Idempotency-Key': `cubitat-alert/${notification.id}`,
        },
        body: JSON.stringify({
          from: sender,
          to: [recipient],
          subject: notification.title,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2>${escapeHtml(notification.title)}</h2><p>${escapeHtml(notification.message)}</p><p><a href="${publicSiteUrl}/resultados">Ver propiedades</a></p></div>`,
        }),
      })
      if (!resendResponse.ok) {
        logWorkerEvent('warn', 'alert_email_dispatch_failed', { source: 'resend', status: resendResponse.status })
        throw new Error('email_provider_failed')
      }
      await updateDelivery(env, notification, 'sent', fetchFn)
      summary.sent += 1
    } catch {
      try {
        await updateDelivery(env, notification, attempts >= 3 ? 'failed' : 'pending', fetchFn)
      } catch {
        logWorkerEvent('error', 'alert_email_dispatch_failed', { source: 'service_role' })
      }
      summary.failed += 1
    }
  }

  return summary
}
