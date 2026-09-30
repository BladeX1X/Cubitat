import type { PushAvailability } from './pushService'

export type PushNotificationStatus =
  | 'loading'
  | 'disabled'
  | 'enabled'
  | 'blocked'
  | PushAvailability
  | 'browser_error'
  | 'configuration_error'
  | 'error'

export function getPushNotificationStatusMessage(status: PushNotificationStatus): string {
  switch (status) {
    case 'ios_install_required':
      return 'Instala Cubitat en la pantalla de inicio para activar las notificaciones.'
    case 'unsupported':
      return 'Este navegador no admite notificaciones de Cubitat.'
    case 'blocked':
      return 'El permiso esta bloqueado. Activalo en los ajustes del navegador o del sistema.'
    case 'enabled':
      return 'Las notificaciones estan activas en este dispositivo.'
    case 'browser_error':
      return 'El navegador no pudo activar las notificaciones. Revisa que Chrome tenga permiso para enviarlas e intenta de nuevo.'
    case 'configuration_error':
      return 'No se pudo preparar el servicio de notificaciones. Reintenta la configuración.'
    case 'error':
      return 'No se pudo actualizar esta preferencia. Intenta de nuevo.'
    default:
      return 'Recibe avisos de propiedades, contactos y actividad importante.'
  }
}
