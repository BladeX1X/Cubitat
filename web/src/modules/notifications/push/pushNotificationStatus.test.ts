import { describe, expect, it } from 'vitest'
import { getPushNotificationStatusMessage } from './pushNotificationStatus'

describe('getPushNotificationStatusMessage', () => {
  it.each([
    ['ios_install_required', 'Instala Cubitat en la pantalla de inicio para activar las notificaciones.'],
    ['unsupported', 'Este navegador no admite notificaciones de Cubitat.'],
    ['blocked', 'El permiso esta bloqueado. Activalo en los ajustes del navegador o del sistema.'],
    ['enabled', 'Las notificaciones estan activas en este dispositivo.'],
    ['browser_error', 'El navegador no pudo activar las notificaciones. Revisa que Chrome tenga permiso para enviarlas e intenta de nuevo.'],
    ['configuration_error', 'No se pudo preparar el servicio de notificaciones. Reintenta la configuración.'],
    ['error', 'No se pudo actualizar esta preferencia. Intenta de nuevo.'],
  ] as const)('maps %s to its user message', (status, message) => {
    expect(getPushNotificationStatusMessage(status)).toBe(message)
  })

  it('uses the neutral message for loading and disabled states', () => {
    const message = 'Recibe avisos de propiedades, contactos y actividad importante.'
    expect(getPushNotificationStatusMessage('loading')).toBe(message)
    expect(getPushNotificationStatusMessage('disabled')).toBe(message)
    expect(getPushNotificationStatusMessage('available')).toBe(message)
  })
})
