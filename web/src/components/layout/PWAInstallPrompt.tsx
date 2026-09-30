import { useEffect, useState } from 'react'
import { RefreshCw, Wifi, WifiOff, X } from 'lucide-react'
import { registerSW } from 'virtual:pwa-register'
import { Button } from '../../shared/ui/button'
import { PWAInstallToast, type BeforeInstallPromptEvent } from './PWAInstallToast'
import {
  hasInstalledRelatedWebApp,
  isAndroidDevice,
  isIOSDevice,
  isStandalonePWA,
} from '../../shared/pwa/installEnvironment'

export const PWA_INSTALL_REQUEST_EVENT = 'cubitat:request-pwa-install'
const PWA_PROMPT_DISMISSED_KEY = 'cubitat_pwa_prompt_dismissed'
const PWA_REMINDER_DELAY_MS = 7 * 24 * 60 * 60 * 1000

function shouldDelayAutomaticPrompt() {
  const storedValue = localStorage.getItem(PWA_PROMPT_DISMISSED_KEY)
  if (!storedValue) return false

  if (storedValue === 'true') {
    localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, String(Date.now()))
    return true
  }

  const dismissedAt = Number(storedValue)
  if (Number.isFinite(dismissedAt) && Date.now() - dismissedAt < PWA_REMINDER_DELAY_MS) {
    return true
  }

  localStorage.removeItem(PWA_PROMPT_DISMISSED_KEY)
  return false
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [manualRequest, setManualRequest] = useState(false)
  const [installedRelatedApp, setInstalledRelatedApp] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [showOnlineNotice, setShowOnlineNotice] = useState(false)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const [updateServiceWorker, setUpdateServiceWorker] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    let active = true
    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (active) setNeedsRefresh(true)
      },
    })

    setUpdateServiceWorker(() => update)

    return () => {
      active = false
      setUpdateServiceWorker(null)
    }
  }, [])

  useEffect(() => {
    function syncNetworkState() {
      const nextIsOffline = !navigator.onLine
      setIsOffline(nextIsOffline)

      if (!nextIsOffline) {
        setShowOnlineNotice(true)
        window.setTimeout(() => setShowOnlineNotice(false), 3600)
      }
    }

    setIsOffline(!navigator.onLine)
    window.addEventListener('online', syncNetworkState)
    window.addEventListener('offline', syncNetworkState)

    return () => {
      window.removeEventListener('online', syncNetworkState)
      window.removeEventListener('offline', syncNetworkState)
    }
  }, [])

  useEffect(() => {
    const isStandalone = isStandalonePWA()

    if (isStandalone) return

    const ios = isIOSDevice()
    const android = isAndroidDevice()
    const delayAutomaticPrompt = shouldDelayAutomaticPrompt()
    let active = true
    setIsAndroid(android)
    setIsIOS(ios)

    void hasInstalledRelatedWebApp().then((installed) => {
      if (!active) return
      setInstalledRelatedApp(installed)
      if (installed) {
        setShowInstallPrompt(false)
        setDeferredPrompt(null)
      }
    })

    async function handleManualInstallRequest() {
      const installed = await hasInstalledRelatedWebApp()
      if (!active) return
      setInstalledRelatedApp(installed)
      setManualRequest(true)
      setShowInstallPrompt(true)
    }

    async function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      const installed = await hasInstalledRelatedWebApp()
      if (!active) return

      setInstalledRelatedApp(installed)
      if (installed) {
        setDeferredPrompt(null)
        setShowInstallPrompt(false)
        return
      }

      setDeferredPrompt(event as BeforeInstallPromptEvent)
      if (!delayAutomaticPrompt) {
        setShowInstallPrompt(true)
      }
    }

    function handleAppInstalled() {
      localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, String(Date.now()))
      setManualRequest(false)
      setInstalledRelatedApp(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener(PWA_INSTALL_REQUEST_EVENT, handleManualInstallRequest)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    if (ios && !delayAutomaticPrompt) {
      const timer = window.setTimeout(() => {
        setShowInstallPrompt(true)
      }, 8000)

      return () => {
        active = false
        window.clearTimeout(timer)
        window.removeEventListener(PWA_INSTALL_REQUEST_EVENT, handleManualInstallRequest)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.removeEventListener('appinstalled', handleAppInstalled)
      }
    }

    return () => {
      active = false
      window.removeEventListener(PWA_INSTALL_REQUEST_EVENT, handleManualInstallRequest)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function handleInstallClick() {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, String(Date.now()))
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    }
  }

  function handleDismissInstall() {
    if (!manualRequest) {
      localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, String(Date.now()))
    }
    setManualRequest(false)
    setShowInstallPrompt(false)
  }

  async function handleRefresh() {
    await updateServiceWorker?.(true)
  }

  return (
    <div className="pwa-toast-stack" aria-live="polite" aria-atomic="false">
      {isOffline && (
        <div className="pwa-toast pwa-toast--offline" role="status">
          <WifiOff size={18} />
          <div>
            <strong>Sin conexión</strong>
            <span>Mostraremos lo que ya esté guardado. Algunas acciones pueden fallar hasta reconectar.</span>
          </div>
        </div>
      )}

      {!isOffline && showOnlineNotice && (
        <div className="pwa-toast pwa-toast--online" role="status">
          <Wifi size={18} />
          <div>
            <strong>Conexión restaurada</strong>
            <span>Ya puedes volver a buscar, guardar y publicar propiedades.</span>
          </div>
          <button
            type="button"
            className="pwa-toast-close"
            onClick={() => setShowOnlineNotice(false)}
            aria-label="Cerrar aviso de conexión"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {needsRefresh && (
        <div className="pwa-toast pwa-toast--update" role="status">
          <RefreshCw size={18} />
          <div>
            <strong>Actualización disponible</strong>
            <span>Hay una versión nueva de Cubitat lista para usar.</span>
          </div>
          <div className="pwa-toast-actions">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="pwa-toast-secondary"
              onClick={() => setNeedsRefresh(false)}
            >
              Luego
            </Button>
            <Button
              type="button"
              size="sm"
              className="pwa-toast-primary"
              onClick={handleRefresh}
            >
              Actualizar
            </Button>
          </div>
        </div>
      )}

      {showInstallPrompt && (
        <PWAInstallToast
          installedRelatedApp={installedRelatedApp}
          isAndroid={isAndroid}
          isIOS={isIOS}
          deferredPrompt={deferredPrompt}
          onDismiss={handleDismissInstall}
          onInstall={handleInstallClick}
        />
      )}
    </div>
  )
}
