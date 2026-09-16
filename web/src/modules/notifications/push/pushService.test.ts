import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readPushBinding, writePushBinding } from './pushBinding'
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushAvailability,
  getCurrentPushSubscription,
  preparePushNotifications,
  urlBase64ToUint8Array,
} from './pushService'

vi.mock('./pushBinding', () => ({
  readPushBinding: vi.fn(),
  writePushBinding: vi.fn(),
}))

const subscriptionJson = {
  endpoint: 'https://push.example.test/subscription-1',
  expirationTime: null,
  keys: { p256dh: 'public-key', auth: 'auth-secret' },
}

function createDependencies(options: {
  permission?: NotificationPermission
  standalone?: boolean
  ios?: boolean
  existing?: boolean
} = {}) {
  const unsubscribe = vi.fn().mockResolvedValue(true)
  const subscription = {
    endpoint: subscriptionJson.endpoint,
    expirationTime: null,
    toJSON: () => subscriptionJson,
    unsubscribe,
  }
  const subscribe = vi.fn().mockResolvedValue(subscription)
  const getSubscription = vi.fn().mockResolvedValue(options.existing ? subscription : null)
  const fetchFn = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ publicKey: 'AQID' }), { status: 200 }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
  const permissionApi = {
    permission: options.permission ?? 'default',
    requestPermission: vi.fn().mockResolvedValue('granted' as NotificationPermission),
  }

  return {
    dependencies: {
      fetchFn,
      navigatorObject: {
        userAgent: options.ios ? 'Mozilla/5.0 (iPhone)' : 'Mozilla/5.0 (Linux; Android)',
        platform: options.ios ? 'iPhone' : 'Linux armv8l',
        maxTouchPoints: options.ios ? 5 : 1,
        standalone: options.standalone,
        serviceWorker: {
          ready: Promise.resolve({ pushManager: { getSubscription, subscribe } }),
        },
      },
      notificationApi: permissionApi,
      pushManagerSupported: true,
      matchMediaFn: () => ({ matches: options.standalone ?? false }),
      getAccessToken: vi.fn().mockResolvedValue('user-token'),
      getUserId: vi.fn().mockResolvedValue('test-user'),
    },
    fetchFn,
    getSubscription,
    permissionApi,
    subscribe,
    subscription,
    unsubscribe,
  }
}

describe('pushService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(readPushBinding).mockReset().mockResolvedValue(null)
    vi.mocked(writePushBinding).mockReset().mockResolvedValue(undefined)
  })

  it('does not report push as enabled when the server endpoint has no local account binding', async () => {
    const { dependencies, fetchFn, subscription, unsubscribe } = createDependencies({ existing: true })
    fetchFn.mockReset().mockResolvedValue(new Response(JSON.stringify({ active: true })))

    await expect(getCurrentPushSubscription(dependencies)).resolves.toBeNull()
    expect(unsubscribe).not.toHaveBeenCalled()
    expect(subscription.endpoint).toBe(subscriptionJson.endpoint)
  })

  it('reports push as enabled only when the local binding matches the authenticated account', async () => {
    const { dependencies, fetchFn, subscription } = createDependencies({ existing: true })
    fetchFn.mockReset().mockResolvedValue(new Response(JSON.stringify({ active: true })))
    vi.mocked(readPushBinding).mockResolvedValue({ userId: 'test-user', endpoint: subscription.endpoint })

    await expect(getCurrentPushSubscription(dependencies)).resolves.toBe(subscription)
  })

  it('offers explicit reactivation when the local binding belongs to another account', async () => {
    const { dependencies, fetchFn, unsubscribe } = createDependencies({ existing: true })
    fetchFn.mockReset().mockResolvedValue(new Response(JSON.stringify({ active: true })))
    vi.mocked(readPushBinding).mockResolvedValue({ userId: 'other-user', endpoint: subscriptionJson.endpoint })

    await expect(getCurrentPushSubscription(dependencies)).resolves.toBeNull()
    expect(unsubscribe).not.toHaveBeenCalled()
  })

  it('does not treat a different account subscription as enabled', async () => {
    const { dependencies, fetchFn, unsubscribe } = createDependencies({ existing: true })
    fetchFn.mockReset().mockResolvedValue(new Response(JSON.stringify({ active: false })))
    await expect(getCurrentPushSubscription(dependencies)).resolves.toBeNull()
    expect(fetchFn).toHaveBeenCalledWith('/api/push/subscription', expect.objectContaining({ method: 'POST' }))
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('unsubscribes locally even when the server deletion fails', async () => {
    const { dependencies, fetchFn, unsubscribe } = createDependencies({ existing: true })
    fetchFn.mockReset().mockRejectedValue(new Error('offline'))
    await expect(disablePushNotifications(dependencies)).rejects.toThrow()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('requires installation before enabling push on iOS', () => {
    const { dependencies } = createDependencies({ ios: true, standalone: false })
    expect(getPushAvailability(dependencies)).toBe('ios_install_required')
  })

  it('reports browsers without PushManager as unsupported', () => {
    const { dependencies } = createDependencies()
    dependencies.pushManagerSupported = false
    expect(getPushAvailability(dependencies)).toBe('unsupported')
  })

  it('subscribes only after permission and persists the current device', async () => {
    const { dependencies, fetchFn, permissionApi, subscribe } = createDependencies()

    const prepared = await preparePushNotifications(dependencies)

    await expect(enablePushNotifications(dependencies, prepared)).resolves.toBe('enabled')

    expect(permissionApi.requestPermission).toHaveBeenCalledOnce()
    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([1, 2, 3]),
    })
    expect(fetchFn).toHaveBeenLastCalledWith('/api/push/subscription', expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({ Authorization: 'Bearer user-token' }),
      body: JSON.stringify(subscriptionJson),
    }))
    expect(permissionApi.requestPermission.mock.invocationCallOrder[0])
      .toBeLessThan(subscribe.mock.invocationCallOrder[0])
    expect(subscribe.mock.invocationCallOrder[0])
      .toBeLessThan(fetchFn.mock.invocationCallOrder[1])
  })

  it('does not persist or enable a push subscription without an authenticated user id', async () => {
    const { dependencies, fetchFn, unsubscribe } = createDependencies()
    dependencies.getUserId.mockResolvedValue(null)
    const prepared = await preparePushNotifications(dependencies)

    await expect(enablePushNotifications(dependencies, prepared)).rejects.toThrow('push_session_missing')
    expect(fetchFn).not.toHaveBeenCalledWith('/api/push/subscription', expect.objectContaining({ method: 'PUT' }))
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('invokes the injected fetch function without binding it to the dependencies object', async () => {
    const { dependencies } = createDependencies()
    const fetchFn = vi.fn(function (this: unknown) {
      if (this !== undefined) return Promise.reject(new TypeError('Illegal invocation'))
      return Promise.resolve(new Response(JSON.stringify({ publicKey: 'AQID' }), { status: 200 }))
    })
    const unboundDependencies = { ...dependencies, fetchFn: fetchFn as typeof fetch }

    await expect(preparePushNotifications(unboundDependencies)).resolves.toEqual(expect.objectContaining({
      applicationServerKey: new Uint8Array([1, 2, 3]),
    }))
  })

  it('does not ask again when notifications are blocked', async () => {
    const { dependencies, permissionApi } = createDependencies({ permission: 'denied' })
    await expect(enablePushNotifications(dependencies)).resolves.toBe('blocked')
    expect(permissionApi.requestPermission).not.toHaveBeenCalled()
  })

  it('deletes only the current browser subscription before unsubscribing', async () => {
    const { dependencies, fetchFn, unsubscribe } = createDependencies({ existing: true })
    fetchFn.mockReset()
    fetchFn.mockResolvedValue(new Response(null, { status: 204 }))

    await disablePushNotifications(dependencies)

    expect(fetchFn).toHaveBeenCalledWith('/api/push/subscription', expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ endpoint: subscriptionJson.endpoint }),
    }))
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('decodes a URL-safe VAPID public key', () => {
    expect(urlBase64ToUint8Array('AQID')).toEqual(new Uint8Array([1, 2, 3]))
  })
})
