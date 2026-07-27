import { describe, expect, it } from 'vitest'
import {
  DEVELOPMENT_SERVICE_WORKER_CLEANUP_SCRIPT,
  isDevelopmentServiceWorkerRequest,
} from './developmentServiceWorkerCleanup'

describe('development service worker cleanup', () => {
  it('intercepts only the root service worker script', () => {
    expect(isDevelopmentServiceWorkerRequest('/sw.js')).toBe(true)
    expect(isDevelopmentServiceWorkerRequest('/sw.js?dev-sw-cleanup=1')).toBe(true)
    expect(isDevelopmentServiceWorkerRequest('/registerSW.js')).toBe(false)
    expect(isDevelopmentServiceWorkerRequest('/assets/sw.js')).toBe(false)
  })

  it('replaces a stale PWA worker with a self-removing cleanup worker', () => {
    expect(DEVELOPMENT_SERVICE_WORKER_CLEANUP_SCRIPT).toContain('self.skipWaiting()')
    expect(DEVELOPMENT_SERVICE_WORKER_CLEANUP_SCRIPT).toContain('caches.keys()')
    expect(DEVELOPMENT_SERVICE_WORKER_CLEANUP_SCRIPT).toContain('caches.delete(cacheName)')
    expect(DEVELOPMENT_SERVICE_WORKER_CLEANUP_SCRIPT).toContain('self.registration.unregister()')
    expect(DEVELOPMENT_SERVICE_WORKER_CLEANUP_SCRIPT).toContain('self.clients.matchAll')
    expect(DEVELOPMENT_SERVICE_WORKER_CLEANUP_SCRIPT).toContain('client.navigate(client.url)')
  })
})
