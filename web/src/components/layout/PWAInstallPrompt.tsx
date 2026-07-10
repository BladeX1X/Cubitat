import { useEffect, useState } from 'react'
import { Download, RefreshCw, Share, Wifi, WifiOff, X } from 'lucide-react'
import { Button } from '../../shared/ui/button'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [showOnlineNotice, setShowOnlineNotice] = useState(false)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const [updateServiceWorker, setUpdateServiceWorker] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    // Temporarily disable SW registration while stabilizing production cache issues.
    setUpdateServiceWorker(null)
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
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true

    if (isStandalone) return

    const isDismissed = localStorage.getItem('cubitat_pwa_prompt_dismissed') === 'true'
    if (isDismissed) return

    const userAgent = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(userAgent) && !/chrome|crios|opios|firefox|fxios/.test(userAgent)
    setIsIOS(ios)

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    if (ios) {
      const timer = window.setTimeout(() => {
        setShowInstallPrompt(true)
      }, 8000)

      return () => {
        window.clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  async function handleInstallClick() {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    }
  }

  function handleDismissInstall() {
    localStorage.setItem('cubitat_pwa_prompt_dismissed', 'true')
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
        <div className="pwa-toast pwa-toast--install" role="status">
          <div className="pwa-install-icon">
            <Download size={20} />
          </div>
          <div>
            <strong>Instalar Cubitat</strong>
            {isIOS ? (
              <span className="pwa-ios-copy">
                Pulsa compartir <Share size={12} /> y selecciona <b>Añadir a pantalla de inicio</b>.
              </span>
            ) : (
              <span>Accede más rápido y conserva soporte básico sin conexión.</span>
            )}
            {!isIOS && (
              <div className="pwa-toast-actions">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="pwa-toast-secondary"
                  onClick={handleDismissInstall}
                >
                  Quizás luego
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="pwa-toast-primary"
                  onClick={handleInstallClick}
                >
                  Instalar app
                </Button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="pwa-toast-close"
            onClick={handleDismissInstall}
            aria-label="Cerrar aviso de instalación"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
