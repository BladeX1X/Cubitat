import { describe, expect, it } from 'vitest'
import serviceWorkerSource from './sw.ts?raw'

describe('service worker push contract', () => {
  it('shows every received push and handles notification clicks', () => {
    expect(serviceWorkerSource).toContain("addEventListener('push'")
    expect(serviceWorkerSource).toContain('showNotification')
    expect(serviceWorkerSource).toContain("addEventListener('notificationclick'")
    expect(serviceWorkerSource).toContain('clients.openWindow')
  })

  it('opens an already displayed notification without rechecking mutable account state', () => {
    const clickHandler = serviceWorkerSource.slice(serviceWorkerSource.indexOf("addEventListener('notificationclick'"))

    expect(clickHandler).not.toContain('mayShowPush')
    expect(clickHandler).toContain("client.visibilityState === 'visible'")
    expect(clickHandler).toContain('opened?.focus()')
  })

  it('accepts only same-origin absolute paths', () => {
    expect(serviceWorkerSource).toContain("startsWith('/')")
    expect(serviceWorkerSource).toContain("startsWith('//')")
    expect(serviceWorkerSource).toContain('target.origin !== self.location.origin')
  })
})
