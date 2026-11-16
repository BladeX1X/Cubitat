import { X, Heart } from 'lucide-react'
import { createPortal } from 'react-dom'
import { Button } from '../../../shared/ui/button'
import { MODAL_LAYER_STYLE } from '../../../shared/ui/layers'
import { useAuthModal } from '../contexts/AuthModalContext'

interface SavePromptModalProps {
  onClose: () => void
}

export function SavePromptModal({ onClose }: SavePromptModalProps) {
  const { openLogin } = useAuthModal()

  function handleLogin() {
    onClose()
    openLogin()
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={MODAL_LAYER_STYLE}
      role="dialog"
      aria-modal="true"
      aria-label="Guardar favorito"
    >
      <div 
        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-75 fade-in duration-300 ease-out">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mt-2 mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 animate-[bounce_2s_infinite]">
            <Heart size={32} className="text-red-500 fill-red-500 animate-[pulse_2s_infinite]" />
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-900 mb-2">
            Inicia sesión para guardar tus favoritos
          </h2>
          <p className="text-sm text-neutral-500 max-w-[280px] mx-auto">
            Así podrás consultarlos en cualquier dispositivo.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12 rounded-xl text-neutral-600 font-semibold border-neutral-200 hover:bg-neutral-50"
            onClick={onClose}
          >
            Ahora no
          </Button>
          <Button
            type="button"
            className="flex-1 h-12 rounded-xl bg-[#035f53] hover:bg-[#024a41] text-white font-semibold"
            onClick={handleLogin}
          >
            Iniciar sesión
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
