import {
  buildPushPayload,
  type PushMessage,
  type PushSubscription,
  type VapidKeys,
} from '@block65/webcrypto-web-push'
import { logWorkerEvent } from './logger'
import { readBoundedJsonObject } from './boundedJson.js'

export interface PushNotificationEnv {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  VAPID_SUBJECT?: string
  VAPID_PUBLIC_KEY?: string
  VAPID_PRIVATE_KEY?: string
}

interface ClaimedDelivery {
  delivery_id: string
  notification_id: string
  subscription_id: string
  endpoint: string
  p256dh: string
  auth: string
  title: string
  message: string
  action_path: string | null
  attempts: number
  user_id: string
}

interface SubscriptionBody {
  endpoint?: unknown
  expirationTime?: unknown
  keys?: { p256dh?: unknown; auth?: unknown }
}

type BuildPayload = (
  message: PushMessage,
  subscription: PushSubscription,
  vapid: VapidKeys,
) => Promise<RequestInit>

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function serviceHeaders(key: string): HeadersInit {
  return { ...JSON_HEADERS, apikey: key, Authorization: `Bearer ${key}` }
}

async function authenticatedUserId(
  authHeader: string,
  env: PushNotificationEnv,
  fetchFn: typeof fetch,
) {
  if (!authHeader.startsWith('Bearer ')) return null
  const response = await fetchFn(`${env.VITE_SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: authHeader },
  })
  if (!response.ok) return null
  const user = await response.json() as { id?: string }
  return user.id ?? null
}

function parseSubscription(body: SubscriptionBody) {
  if (typeof body.endpoint !== 'string'
    || typeof body.keys?.p256dh !== 'string'
    || typeof body.keys.auth !== 'string') return null

  try {
    const endpoint = new URL(body.endpoint)
    if (endpoint.protocol !== 'https:' || body.endpoint.length > 2048) return null
  } catch {
    return null
  }

  if (body.keys.p256dh.length < 16 || body.keys.p256dh.length > 512
    || body.keys.auth.length < 8 || body.keys.auth.length > 256) return null

  return {
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    expiration_time: typeof body.expirationTime === 'number' ? body.expirationTime : null,
  }
}

export async function handlePushSubscriptionRequest(
  request: Request,
  env: PushNotificationEnv,
  fetchFn: typeof fetch = fetch,
) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return jsonResponse({ error: 'Unavailable' }, 503)
  const userId = await authenticatedUserId(request.headers.get('Authorization') || '', env, fetchFn)
  if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401)

  const parsed = await readBoundedJsonObject<SubscriptionBody>(request, 8 * 1024)
  if (!parsed.ok) {
    const message = parsed.status === 413 ? 'Payload too large'
      : parsed.status === 408 ? 'Request body timed out'
        : 'Invalid request'
    return jsonResponse({ error: message }, parsed.status)
  }
  const body = parsed.value

  if (request.method === 'PUT') {
    const subscription = parseSubscription(body)
    if (!subscription) return jsonResponse({ error: 'Invalid subscription' }, 400)
    const response = await fetchFn(
      `${env.VITE_SUPABASE_URL}/rest/v1/push_subscriptions?on_conflict=endpoint`,
      {
        method: 'POST',
        headers: {
          ...serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({ ...subscription, user_id: userId }),
      },
    )
    return response.ok ? new Response(null, { status: 204 }) : jsonResponse({ error: 'Subscription failed' }, 502)
  }

  if (request.method === 'POST') {
    if (typeof body.endpoint !== 'string' || body.endpoint.length > 2048) {
      return jsonResponse({ error: 'Invalid subscription' }, 400)
    }
    const response = await fetchFn(
      `${env.VITE_SUPABASE_URL}/rest/v1/push_subscriptions?select=id&user_id=eq.${encodeURIComponent(userId)}&endpoint=eq.${encodeURIComponent(body.endpoint)}`,
      { headers: serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY) },
    )
    if (!response.ok) return jsonResponse({ error: 'Subscription status failed' }, 502)
    const rows = await response.json() as Array<{ id: string }>
    return jsonResponse({ active: rows.length > 0 }, 200)
  }

  if (request.method === 'DELETE') {
    if (typeof body.endpoint !== 'string' || body.endpoint.length > 2048) {
      return jsonResponse({ error: 'Invalid subscription' }, 400)
    }
    const response = await fetchFn(
      `${env.VITE_SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(userId)}&endpoint=eq.${encodeURIComponent(body.endpoint)}`,
      {
        method: 'DELETE',
        headers: { ...serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY), Prefer: 'return=minimal' },
      },
    )
    return response.ok ? new Response(null, { status: 204 }) : jsonResponse({ error: 'Subscription failed' }, 502)
  }

  return jsonResponse({ error: 'Method not allowed' }, 405)
}

async function updateDelivery(
  env: PushNotificationEnv,
  delivery: ClaimedDelivery,
  status: 'pending' | 'sent' | 'failed',
  fetchFn: typeof fetch,
) {
  const response = await fetchFn(
    `${env.VITE_SUPABASE_URL}/rest/v1/notification_push_deliveries?id=eq.${encodeURIComponent(delivery.delivery_id)}&status=eq.sending&attempts=eq.${delivery.attempts}`,
    {
      method: 'PATCH',
      headers: {
        ...serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY as string),
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      }),
    },
  )
  if (!response.ok) throw new Error('push_delivery_update_failed')
}

export interface PushDispatchSummary {
  scanned: number
  sent: number
  failed: number
  expired: number
}

export async function dispatchPendingPushNotifications(
  env: PushNotificationEnv,
  fetchFn: typeof fetch = fetch,
  buildPayload: BuildPayload = buildPushPayload,
): Promise<PushDispatchSummary> {
  const summary: PushDispatchSummary = { scanned: 0, sent: 0, failed: 0, expired: 0 }
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.VAPID_SUBJECT
    || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    logWorkerEvent('warn', 'push_dispatch_skipped', { reason: 'missing_configuration' })
    return summary
  }

  let deliveries: ClaimedDelivery[]
  try {
    const response = await fetchFn(
      `${env.VITE_SUPABASE_URL}/rest/v1/rpc/claim_pending_push_deliveries`,
      {
        method: 'POST',
        headers: serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
        body: JSON.stringify({ p_limit: 50 }),
      },
    )
    if (!response.ok) throw new Error('push_claim_failed')
    deliveries = await response.json() as ClaimedDelivery[]
  } catch {
    logWorkerEvent('error', 'push_dispatch_failed', { source: 'service_role' })
    return summary
  }

  summary.scanned = deliveries.length
  const vapid: VapidKeys = {
    subject: env.VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  }

  for (const delivery of deliveries) {
    try {
      const message: PushMessage = {
        data: JSON.stringify({
          title: delivery.title.slice(0, 120),
          body: delivery.message.slice(0, 280),
          actionPath: delivery.action_path,
          notificationId: delivery.notification_id,
          endpoint: delivery.endpoint,
          userId: delivery.user_id,
        }),
        options: { ttl: 86_400, urgency: 'high' },
      }
      const subscription: PushSubscription = {
        endpoint: delivery.endpoint,
        expirationTime: null,
        keys: { p256dh: delivery.p256dh, auth: delivery.auth },
      }
      const payload = await buildPayload(message, subscription, vapid)
      // Revalidate after encryption, immediately before contacting the provider.
      const authorization = await fetchFn(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/authorize_push_delivery`, {
        method: 'POST',
        headers: serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
        body: JSON.stringify({ p_delivery_id: delivery.delivery_id, p_attempt: delivery.attempts }),
      })
      if (!authorization.ok) throw new Error('push_authorization_failed')
      if (await authorization.json() !== true) continue
      const response = await fetchFn(delivery.endpoint, payload)

      if (response.status === 404 || response.status === 410) {
        const deleteResponse = await fetchFn(
          `${env.VITE_SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(delivery.subscription_id)}`,
          {
            method: 'DELETE',
            headers: { ...serviceHeaders(env.SUPABASE_SERVICE_ROLE_KEY), Prefer: 'return=minimal' },
          },
        )
        if (!deleteResponse.ok) throw new Error('push_subscription_cleanup_failed')
        summary.expired += 1
        continue
      }

      if (!response.ok) throw new Error('push_provider_failed')
      await updateDelivery(env, delivery, 'sent', fetchFn)
      summary.sent += 1
    } catch {
      try {
        await updateDelivery(env, delivery, delivery.attempts >= 3 ? 'failed' : 'pending', fetchFn)
      } catch {
        logWorkerEvent('error', 'push_dispatch_failed', { source: 'service_role' })
      }
      summary.failed += 1
    }
  }

  return summary
}
