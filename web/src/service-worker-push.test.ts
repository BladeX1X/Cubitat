import { describe, expect, it } from 'vitest'
import serviceWorkerSource from './sw.ts?raw'

describe('service worker push contract', () => {
  it('shows every received push and handles notification clicks', () => {
    expect(serviceWorkerSource).toContain("addEventListener('push'")
    expect(serviceWorkerSource).toContain('showNotification')
    expect(serviceWorkerSource).toContain("addEventListener('notificationclick'")
    expect(serviceWorkerSource).toContain('clients.openWindow')
  })

  it('accepts only same-origin absolute paths', () => {
    expect(serviceWorkerSource).toContain("startsWith('/')")
    expect(serviceWorkerSource).toContain("startsWith('//')")
    expect(serviceWorkerSource).toContain('target.origin !== self.location.origin')
  })
})
