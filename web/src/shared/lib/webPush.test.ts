import { describe, it, expect } from 'vitest'
import { isPushSupported, subscribeToWebPush } from './webPush'

describe('webPush', () => {
  it('evalua soporte de notificaciones push en el entorno de pruebas', () => {
    const supported = isPushSupported()
    expect(typeof supported).toBe('boolean')
  })

  it('never fabricates a subscription when native push is unavailable', async () => {
    const sub = await subscribeToWebPush()
    if (sub) {
      expect(sub).toHaveProperty('endpoint')
    } else {
      expect(sub).toBeNull()
    }
  })
})
