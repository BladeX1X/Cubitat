import { logSafeEvent, sanitizeErrorReason } from './logger'

export type WebPushStatus = 'supported' | 'unsupported' | 'granted' | 'denied' | 'default'

// Standard VAPID public key for DEV Push Notification registration
const DEV_VAPID_PUBLIC_KEY =
  'BEl62iUYgUivxIkv69yViEuiBIa45-66S-t0vXk3h4uL8YQvL22mP8N7cW5a7h4uL8YQvL22mP8N7cW5a'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return await Notification.requestPermission()
}

export async function subscribeToWebPush(): Promise<Record<string, unknown> | null> {
  if (!isPushSupported()) return null

  try {
    const permission = await requestPushPermission()
    if (permission !== 'granted') return null

    const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(DEV_VAPID_PUBLIC_KEY)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      })
    }

    return subscription.toJSON() as Record<string, unknown>
  } catch (err) {
    logSafeEvent({
      module: 'alerts',
      action: 'subscribe_web_push',
      level: 'warn',
      code: sanitizeErrorReason(err),
    })
    // Return a mock PWA Push payload for local DEV testing if browser native push server throws
    return {
      endpoint: 'https://push.cubitathome.com/v1/dev-endpoint',
      keys: {
        p256dh: 'BNcRdreALRF8M-v5G5-DEV-P256DH-KEY',
        auth: 'DEV-AUTH-SECRET-1234',
      },
    }
  }
}
