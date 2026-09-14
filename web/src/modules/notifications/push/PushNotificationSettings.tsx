import { useEffect, useState } from 'react'
import { BellOff, BellRing, Loader2 } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import {
  disablePushNotifications,
  enablePushNotifications,
  getCurrentPushSubscription,
  getPushAvailability,
  type PushAvailability,
} from './pushService'

type Status = 'loading' | 'disabled' | 'enabled' | 'blocked' | PushAvailability | 'error'

const defaultServices = {
  getAvailability: getPushAvailability,
  getPermission: () => typeof Notification === 'undefined' ? 'default' as const : Notification.permission,
  getSubscription: getCurrentPushSubscription,
  enable: enablePushNotifications,
  disable: disablePushNotifications,
}

type PushServices = typeof defaultServices

export function PushNotificationSettings({
  services = defaultServices,
}: {
  services?: PushServices
}) {
  const [status, setStatus] = useState<Status>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    const availability = services.getAvailability()
    if (availability !== 'available') {
      setStatus(availability)
      return () => { active = false }
    }
    if (services.getPermission() === 'denied') {
      setStatus('blocked')
      return () => { active = false }
    }

    void services.getSubscription()
      .then((subscription) => {
        if (active) setStatus(subscription ? 'enabled' : 'disabled')
      })
      .catch(() => {
        if (active) setStatus('error')
      })

    return () => { active = false }
  }, [services])

  async function handleEnable() {
    setBusy(true)
    try {
      const result = await services.enable()
      setStatus(result === 'enabled' ? 'enabled' : 'blocked')
    } catch {
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable() {
    setBusy(true)
    try {
      await services.disable()
      setStatus('disabled')
    } catch {
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  const message = status === 'ios_install_required'
    ? 'Instala Cubitat en la pantalla de inicio para activar las notificaciones.'
    : status === 'unsupported'
      ? 'Este navegador no admite notificaciones de Cubitat.'
      : status === 'blocked'
        ? 'El permiso esta bloqueado. Activalo en los ajustes del navegador o del sistema.'
        : status === 'enabled'
          ? 'Las notificaciones estan activas en este dispositivo.'
          : status === 'error'
            ? 'No se pudo actualizar esta preferencia. Intenta de nuevo.'
            : 'Recibe avisos de propiedades, contactos y actividad importante.'

  return (
    <section className="border-y border-[#dbe7e4] bg-white px-4 py-5 sm:px-6" aria-labelledby="push-notifications-title">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e1f7f1] text-[#007565]">
          {status === 'blocked' || status === 'unsupported' ? <BellOff size={20} /> : <BellRing size={20} />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="push-notifications-title" className="text-lg font-black text-[#102d29]">
            Notificaciones en este dispositivo
          </h2>
          <p className="mt-1 text-sm font-medium leading-6 text-[#62736f]" aria-live="polite">
            {status === 'loading' ? 'Comprobando disponibilidad...' : message}
          </p>
        </div>
      </div>

      {status === 'disabled' || status === 'error' ? (
        <Button className="mt-4 h-11 w-full font-bold sm:w-auto" onClick={handleEnable} disabled={busy}>
          {busy ? <Loader2 className="mr-2 animate-spin" size={17} /> : <BellRing className="mr-2" size={17} />}
          Activar notificaciones
        </Button>
      ) : null}
      {status === 'enabled' ? (
        <Button variant="outline" className="mt-4 h-11 w-full font-bold sm:w-auto" onClick={handleDisable} disabled={busy}>
          {busy ? <Loader2 className="mr-2 animate-spin" size={17} /> : <BellOff className="mr-2" size={17} />}
          Desactivar en este dispositivo
        </Button>
      ) : null}
    </section>
  )
}
