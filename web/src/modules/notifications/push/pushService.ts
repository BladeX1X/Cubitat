import { supabase } from '../../../shared/lib/supabaseClient'
import { readPushBinding, writePushBinding } from './pushBinding'

export type PushAvailability = 'available' | 'ios_install_required' | 'unsupported'
export type PushEnableResult = 'enabled' | 'blocked'

interface PushSubscriptionLike {
  endpoint: string
  expirationTime: number | null
  toJSON(): PushSubscriptionJSON
  unsubscribe(): Promise<boolean>
}

interface PushManagerLike {
  getSubscription(): Promise<PushSubscriptionLike | null>
  subscribe(options: PushSubscriptionOptionsInit): Promise<PushSubscriptionLike>
}

interface ServiceWorkerContainerLike {
  ready: Promise<{ pushManager: PushManagerLike; getNotifications?: () => Promise<Array<{ close(): void }>> }>
}

interface NavigatorLike {
  userAgent: string
  platform: string
  maxTouchPoints: number
  standalone?: boolean
  serviceWorker?: ServiceWorkerContainerLike
}

interface NotificationApiLike {
  permission: NotificationPermission
  requestPermission(): Promise<NotificationPermission>
}

export interface PushServiceDependencies {
  fetchFn: typeof fetch
  navigatorObject: NavigatorLike
  notificationApi?: NotificationApiLike
  pushManagerSupported: boolean
  matchMediaFn: (query: string) => { matches: boolean }
  getAccessToken: () => Promise<string | null>
  getUserId?: () => Promise<string | null>
}

function defaultDependencies(): PushServiceDependencies {
  return {
    fetchFn: fetch,
    navigatorObject: navigator as Navigator & { standalone?: boolean },
    notificationApi: typeof Notification === 'undefined' ? undefined : Notification,
    pushManagerSupported: typeof PushManager !== 'undefined',
    matchMediaFn: (query) => window.matchMedia(query),
    getAccessToken: async () => {
      const { data } = await supabase.auth.getSession()
      return data.session?.access_token ?? null
    },
    getUserId: async () => (await supabase.auth.getSession()).data.session?.user.id ?? null,
  }
}

function isIOS(navigatorObject: NavigatorLike) {
  return /iPad|iPhone|iPod/.test(navigatorObject.userAgent)
    || (navigatorObject.platform === 'MacIntel' && navigatorObject.maxTouchPoints > 1)
}

function isStandalone(dependencies: PushServiceDependencies) {
  return dependencies.matchMediaFn('(display-mode: standalone)').matches
    || dependencies.navigatorObject.standalone === true
}

export function getPushAvailability(
  dependencies: PushServiceDependencies = defaultDependencies(),
): PushAvailability {
  if (isIOS(dependencies.navigatorObject) && !isStandalone(dependencies)) {
    return 'ios_install_required'
  }

  if (!dependencies.notificationApi
    || !dependencies.navigatorObject.serviceWorker
    || !dependencies.pushManagerSupported) {
    return 'unsupported'
  }

  return 'available'
}

export function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

async function accessToken(dependencies: PushServiceDependencies) {
  const token = await dependencies.getAccessToken()
  if (!token) throw new Error('push_session_missing')
  return token
}

async function persistSubscription(
  subscription: PushSubscriptionLike,
  dependencies: PushServiceDependencies,
) {
  const token = await accessToken(dependencies)
  const response = await dependencies.fetchFn('/api/push/subscription', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscription.toJSON()),
  })
  if (!response.ok) throw new Error('push_subscription_persist_failed')
}

export async function getCurrentPushSubscription(
  dependencies: PushServiceDependencies = defaultDependencies(),
) {
  if (getPushAvailability(dependencies) !== 'available') return null
  const registration = await dependencies.navigatorObject.serviceWorker?.ready
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return null
  const token = await accessToken(dependencies)
  const response = await dependencies.fetchFn('/api/push/subscription', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })
  if (!response.ok) throw new Error('push_subscription_status_failed')
  const result = await response.json() as { active?: boolean }
  return result.active === true ? subscription : null
}

export async function enablePushNotifications(
  dependencies: PushServiceDependencies = defaultDependencies(),
): Promise<PushEnableResult> {
  if (getPushAvailability(dependencies) !== 'available') {
    throw new Error('push_unavailable')
  }

  const notificationApi = dependencies.notificationApi
  if (!notificationApi) throw new Error('push_unavailable')
  if (notificationApi.permission === 'denied') return 'blocked'

  const permission = notificationApi.permission === 'granted'
    ? 'granted'
    : await notificationApi.requestPermission()
  if (permission !== 'granted') return 'blocked'

  const keyResponse = await dependencies.fetchFn('/api/push/vapid-public-key')
  if (!keyResponse.ok) throw new Error('push_configuration_unavailable')
  const { publicKey } = await keyResponse.json() as { publicKey?: string }
  if (!publicKey) throw new Error('push_configuration_unavailable')

  const registration = await dependencies.navigatorObject.serviceWorker?.ready
  if (!registration) throw new Error('push_service_worker_unavailable')
  const tokenBefore = await accessToken(dependencies)
  const userId = await dependencies.getUserId?.() ?? null
  let existing = await registration.pushManager.getSubscription()
  if (existing && !await getCurrentPushSubscription(dependencies)) {
    await writePushBinding({ userId, endpoint: null })
    if (!await existing.unsubscribe()) throw new Error('push_unsubscribe_failed')
    existing = null
  }
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  try {
    if (tokenBefore !== await accessToken(dependencies)) throw new Error('push_session_changed')
    await persistSubscription(subscription, dependencies)
    if (tokenBefore !== await accessToken(dependencies)) throw new Error('push_session_changed')
    await writePushBinding({ userId, endpoint: subscription.endpoint })
  } catch (error) {
    await writePushBinding({ userId: null, endpoint: null })
    await subscription.unsubscribe()
    throw error
  }
  return 'enabled'
}

export async function disablePushNotifications(
  dependencies: PushServiceDependencies = defaultDependencies(),
) {
  await writePushBinding({ userId: null, endpoint: null })
  const registration = await dependencies.navigatorObject.serviceWorker?.ready
  const subscription = await registration?.pushManager.getSubscription()
  const notifications = await registration?.getNotifications?.()
  notifications?.forEach((notification) => notification.close())
  if (!subscription) return
  // Cancel locally before network I/O, including offline logout.
  if (!await subscription.unsubscribe()) throw new Error('push_unsubscribe_failed')
  const token = await accessToken(dependencies)
  const response = await dependencies.fetchFn('/api/push/subscription', {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })
  if (!response.ok) throw new Error('push_subscription_delete_failed')
}

export async function reconcilePushSession(
  userId: string | null,
  dependencies: PushServiceDependencies = defaultDependencies(),
) {
  const binding = await readPushBinding()
  if (binding?.userId === userId) return
  // Invalidate delivery visibility before asynchronous unsubscription or server access.
  await writePushBinding({ userId, endpoint: null })
  if (!dependencies.navigatorObject.serviceWorker || !dependencies.pushManagerSupported) return
  const registration = await dependencies.navigatorObject.serviceWorker.ready
  const notifications = await registration.getNotifications?.()
  notifications?.forEach((notification) => notification.close())
  const subscription = await registration.pushManager.getSubscription()
  if (subscription && !await subscription.unsubscribe()) throw new Error('push_unsubscribe_failed')
}
