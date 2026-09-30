import { describe, expect, it } from 'vitest'
import serviceWorkerSource from './sw.ts?raw'
import { actionPathWithNotification, safeActionPath } from './swRouting'

const origin = 'https://cubitat.example'

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

  it('carries the notification id to the authenticated app for read acknowledgement', () => {
    expect(actionPathWithNotification(
      '/propiedad/property-1',
      '123e4567-e89b-12d3-a456-426614174000',
      origin,
    )).toContain('cubitat_notification=123e4567-e89b-12d3-a456-426614174000')
  })

  it('accepts only same-origin absolute paths', () => {
    expect(safeActionPath('/propiedad/property-1', origin)).toBe('/propiedad/property-1')
    expect(safeActionPath('//attacker.example', origin)).toBe('/')
    expect(safeActionPath('https://attacker.example', origin)).toBe('/')
  })
})
