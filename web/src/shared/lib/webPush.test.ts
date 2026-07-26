import { describe, it, expect } from 'vitest'
import { isPushSupported, subscribeToWebPush } from './webPush'

describe('webPush', () => {
  it('evalua soporte de notificaciones push en el entorno de pruebas', () => {
    const supported = isPushSupported()
    expect(typeof supported).toBe('boolean')
  })

  it('retorna suscripcion mock o valida al solicitar suscripcion', async () => {
    const sub = await subscribeToWebPush()
    // En happy-dom / test env, retorna null o el mock DEV de suscripcion
    if (sub) {
      expect(sub).toHaveProperty('endpoint')
    } else {
      expect(sub).toBeNull()
    }
  })
})
