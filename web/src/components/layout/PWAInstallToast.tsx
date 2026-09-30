import { CircleCheck, Download, Share, X } from 'lucide-react'
import { Button } from '../../shared/ui/button'

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type PWAInstallToastProps = {
  installedRelatedApp: boolean
  isAndroid: boolean
  isIOS: boolean
  deferredPrompt: BeforeInstallPromptEvent | null
  onDismiss: () => void
  onInstall: () => void
}

export function PWAInstallToast({
  installedRelatedApp,
  isAndroid,
  isIOS,
  deferredPrompt,
  onDismiss,
  onInstall,
}: PWAInstallToastProps) {
  return (
    <div className="pwa-toast pwa-toast--install" role="status">
      <div className="pwa-install-icon">
        {installedRelatedApp ? <CircleCheck size={20} /> : <Download size={20} />}
      </div>
      <div>
        <strong>{installedRelatedApp ? 'Cubitat ya está instalada' : 'Instalar Cubitat'}</strong>
        {installedRelatedApp ? (
          <span>Ábrela desde el icono de Cubitat en tu pantalla de inicio.</span>
        ) : isIOS ? (
          <span className="pwa-ios-copy">
            En Safari, pulsa Compartir <Share size={12} />, selecciona <b>Añadir a pantalla de inicio</b> y confirma <b>Añadir</b>.
          </span>
        ) : (
          <span>
            {deferredPrompt
              ? 'Accede más rápido y conserva soporte básico sin conexión.'
              : isAndroid
                ? 'En Chrome, abre el menú y elige Instalar aplicación.'
                : 'Abre el menú de tu navegador y elige Instalar aplicación.'}
          </span>
        )}
        {!installedRelatedApp && !isIOS && deferredPrompt && (
          <div className="pwa-toast-actions">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="pwa-toast-secondary"
              onClick={onDismiss}
            >
              Quizás luego
            </Button>
            <Button
              type="button"
              size="sm"
              className="pwa-toast-primary"
              onClick={onInstall}
            >
              Instalar app
            </Button>
          </div>
        )}
        {(installedRelatedApp || isIOS) && (
          <div className="pwa-toast-actions">
            <Button
              type="button"
              size="sm"
              className="pwa-toast-primary"
              onClick={onDismiss}
            >
              Entendido
            </Button>
          </div>
        )}
      </div>
      <button
        type="button"
        className="pwa-toast-close"
        onClick={onDismiss}
        aria-label="Cerrar aviso de instalación"
      >
        <X size={15} />
      </button>
    </div>
  )
}
