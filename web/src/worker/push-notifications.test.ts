import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  dispatchPendingPushNotifications,
  handlePushSubscriptionRequest,
  type PushNotificationEnv,
} from './push-notifications'

const baseEnv: PushNotificationEnv = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'anon-key',
  VAPID_SUBJECT: 'mailto:soporte@cubitathome.com',
  VAPID_PUBLIC_KEY: 'public-vapid-key',
  VAPID_PRIVATE_KEY: 'private-vapid-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
}

afterEach(() => vi.restoreAllMocks())

describe('push subscription endpoint', () => {
  it('checks server ownership rather than browser existence', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-2' })))
      .mockResolvedValueOnce(new Response('[]'))
    const response = await handlePushSubscriptionRequest(new Request('https://cubitathome.com/api/push/subscription', {
      method: 'POST', headers: { Authorization: 'Bearer token' },
      body: JSON.stringify({ endpoint: 'https://push.test/one' }),
    }), baseEnv, fetchFn)
    expect(await response.json()).toEqual({ active: false })
    expect(fetchFn.mock.calls[1][0]).toContain('user_id=eq.user-2')
  })
  it('upserts a validated subscription for the authenticated user', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'user-1' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
    const response = await handlePushSubscriptionRequest(
      new Request('https://cubitathome.com/api/push/subscription', {
        method: 'PUT',
        headers: { Authorization: 'Bearer user-token', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'https://push.example.test/subscription-1',
          expirationTime: null,
          keys: { p256dh: 'public-key-material', auth: 'auth-secret' },
        }),
      }),
      baseEnv,
      fetchFn,
    )

    expect(response.status).toBe(204)
    expect(fetchFn).toHaveBeenNthCalledWith(2,
      'https://example.supabase.co/rest/v1/push_subscriptions?on_conflict=endpoint',
      expect.objectContaining({ method: 'POST' }),
    )
    const persisted = JSON.parse(String(fetchFn.mock.calls[1]?.[1]?.body))
    expect(persisted).toMatchObject({ user_id: 'user-1' })
  })

  it('rejects malformed or unauthenticated subscription requests', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }))
    const response = await handlePushSubscriptionRequest(
      new Request('https://cubitathome.com/api/push/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: 'javascript:alert(1)', keys: {} }),
      }),
      baseEnv,
      fetchFn,
    )
    expect(response.status).toBe(401)
    expect(fetchFn).not.toHaveBeenCalled()
  })
})

describe('push dispatcher', () => {
  it('sends claimed deliveries and marks them as sent', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        delivery_id: 'delivery-1',
        subscription_id: 'subscription-1',
        endpoint: 'https://push.example.test/subscription-1',
        p256dh: 'public-key',
        auth: 'auth-secret',
        title: 'Nueva propiedad',
        message: 'Hay una coincidencia.',
        action_path: '/propiedad/property-1',
        attempts: 1,
        user_id: 'user-1',
      }]), { status: 200 }))
      .mockResolvedValueOnce(new Response('true'))
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const buildPayload = vi.fn().mockResolvedValue({ method: 'POST', headers: {}, body: 'encrypted' })

    const summary = await dispatchPendingPushNotifications(baseEnv, fetchFn, buildPayload)

    expect(summary).toEqual({ scanned: 1, sent: 1, failed: 0, expired: 0 })
    expect(buildPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.stringContaining('/propiedad/property-1'),
        options: { ttl: 86_400, urgency: 'high' },
      }),
      expect.objectContaining({ endpoint: 'https://push.example.test/subscription-1' }),
      expect.objectContaining({ subject: 'mailto:soporte@cubitathome.com' }),
    )
    expect(JSON.parse(String(fetchFn.mock.calls[3]?.[1]?.body))).toMatchObject({ status: 'sent' })
    expect(fetchFn.mock.calls[3][0]).toContain('status=eq.sending&attempts=eq.1')
  })

  it('removes an expired subscription after a 410 response', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        delivery_id: 'delivery-1', subscription_id: 'subscription-1',
        endpoint: 'https://push.example.test/expired', p256dh: 'key', auth: 'auth',
        title: 'Aviso', message: 'Mensaje', action_path: '/mi-cuenta', attempts: 1,
      }]), { status: 200 }))
      .mockResolvedValueOnce(new Response('true'))
      .mockResolvedValueOnce(new Response(null, { status: 410 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    const summary = await dispatchPendingPushNotifications(
      baseEnv,
      fetchFn,
      vi.fn().mockResolvedValue({ method: 'POST' }),
    )

    expect(summary.expired).toBe(1)
    expect(String(fetchFn.mock.calls[3]?.[0])).toContain('/push_subscriptions?id=eq.subscription-1')
    expect(fetchFn.mock.calls[3]?.[1]?.method).toBe('DELETE')
  })

  it('drops a claim invalidated during encryption without contacting the provider', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{
        delivery_id: 'old', subscription_id: 'sub', endpoint: 'https://push.test/old',
        p256dh: 'key', auth: 'auth', title: 'Secret', message: 'A only', attempts: 1, user_id: 'A',
      }])))
      .mockResolvedValueOnce(new Response('false'))
    const summary = await dispatchPendingPushNotifications(baseEnv, fetchFn, vi.fn().mockResolvedValue({ method: 'POST' }))
    expect(summary.sent).toBe(0)
    expect(fetchFn).toHaveBeenCalledTimes(2)
    expect(fetchFn.mock.calls[1][0]).toContain('/rpc/authorize_push_delivery')
  })
})
