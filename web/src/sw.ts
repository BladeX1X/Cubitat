/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { CacheFirst } from 'workbox-strategies'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { mayShowPush } from './modules/notifications/push/pushBinding'
import { actionPathWithNotification, safeActionPath } from './swRouting'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision?: string | null }> }

self.skipWaiting()
clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/\/api\//] }))
registerRoute(
  /^(https:\/\/.*\.supabase\.co|\/api\/supabase)\/storage\/v1\/object\/public\/.*/i,
  new CacheFirst({
    cacheName: 'supabase-image-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

interface CubitatPushPayload {
  endpoint?: unknown
  userId?: unknown
  title?: unknown
  body?: unknown
  actionPath?: unknown
  notificationId?: unknown
}

self.addEventListener('push', (event: PushEvent) => {
  let payload: CubitatPushPayload = {}
  try {
    payload = event.data?.json() as CubitatPushPayload ?? {}
  } catch {
    payload = { body: event.data?.text() }
  }

  const title = typeof payload.title === 'string' ? payload.title.slice(0, 120) : 'Cubitat'
  const body = typeof payload.body === 'string' ? payload.body.slice(0, 280) : 'Tienes una notificacion nueva.'
  const actionPath = actionPathWithNotification(payload.actionPath, payload.notificationId, self.location.origin)

  event.waitUntil((async () => {
    if (!await mayShowPush(payload.endpoint, payload.userId)) return
    const subscription = await self.registration.pushManager.getSubscription()
    if (subscription?.endpoint !== payload.endpoint) return
    await self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/favicon-48.png',
    data: { actionPath, endpoint: payload.endpoint, userId: payload.userId },
    })
  })())
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const actionPath = safeActionPath(
    (event.notification.data as { actionPath?: unknown } | undefined)?.actionPath,
    self.location.origin,
  )
  const targetUrl = new URL(actionPath, self.location.origin).href

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find((client) => client.url === targetUrl)
      ?? windows.find((client) => (
        new URL(client.url).origin === self.location.origin
        && client.visibilityState === 'visible'
      ))
    if (existing) {
      try {
        const navigated = existing.url === targetUrl ? existing : await existing.navigate(targetUrl)
        await (navigated ?? existing).focus()
        return
      } catch {
        // A stale browser client must not prevent the installed PWA from opening.
      }
    }
    const opened = await self.clients.openWindow(targetUrl)
    await opened?.focus()
  })())
})

export {}
