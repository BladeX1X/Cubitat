import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button } from '../../shared/ui/button'

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // 1. Detectar si la app ya corre en modo standalone (instalada)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isStandalone) return

    // 2. Detectar si el usuario ya la cerró permanentemente
    const isDismissed = localStorage.getItem('cubitat_pwa_prompt_dismissed') === 'true'
    if (isDismissed) return

    // 3. Detectar iOS (Safari)
    const userAgent = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(userAgent) && !/chrome|crios|opios|firefox|fxios/.test(userAgent)
    setIsIOS(ios)

    // 4. Manejador para Android/Chrome/Edge (beforeinstallprompt)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 5. Para iOS, como no soporta el evento natively, sugerimos la instalación proactiva tras 8 segundos
    if (ios) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 8000)
      return () => clearTimeout(timer)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowPrompt(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('cubitat_pwa_prompt_dismissed', 'true')
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-96 bg-white border border-neutral-200 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex gap-3 items-start">
        <div className="p-2.5 rounded-xl bg-[#035f53]/10 text-[#035f53] shrink-0">
          <Download size={20} className="animate-bounce" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-neutral-900">Instalar Cubitat</h4>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            {isIOS ? (
              <span className="flex items-center gap-1.5 flex-wrap">
                Pulsa el botón de compartir <Share size={12} className="inline text-neutral-600" /> y selecciona <strong>"Añadir a pantalla de inicio"</strong>.
              </span>
            ) : (
              'Accede más rápido, sin consumir datos de red móvil adicionales y con soporte offline.'
            )}
          </p>
          {!isIOS && (
            <div className="flex gap-2 mt-3 justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs rounded-lg text-neutral-500 hover:text-neutral-700 h-8"
                onClick={handleDismiss}
              >
                Quizás luego
              </Button>
              <Button
                size="sm"
                className="text-xs rounded-lg bg-[#035f53] hover:bg-[#024a41] text-white font-medium h-8 px-4"
                onClick={handleInstallClick}
              >
                Instalar app
              </Button>
            </div>
          )}
        </div>
        <button
          type="button"
          className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 shrink-0"
          onClick={handleDismiss}
          aria-label="Cerrar aviso"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
