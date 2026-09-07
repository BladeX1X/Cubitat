import { ShieldCheck, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useKycSubmission } from '../hooks/useKycSubmission'
import { KycDocumentForm } from './KycDocumentForm'
import { KycSubmissionSuccess } from './KycSubmissionSuccess'

type KycSubmissionModalProps = {
  userId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function KycSubmissionModal({ userId, isOpen, onClose, onSuccess }: KycSubmissionModalProps) {
  const submission = useKycSubmission({ userId, onClose, onSuccess })
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const loadingRef = useRef(submission.loading)

  useEffect(() => {
    onCloseRef.current = onClose
    loadingRef.current = submission.loading
  }, [onClose, submission.loading])

  useEffect(() => {
    if (!isOpen) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loadingRef.current) {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submission.loading) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Solicitud de verificacion KYC"
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
      >
        <button ref={closeButtonRef} type="button" onClick={onClose} disabled={submission.loading}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 focus:outline-none disabled:opacity-50"
          aria-label="Cerrar modal">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Solicitud de Verificación KYC</h2>
            <p className="text-xs text-neutral-500">Verifica tu identidad para obtener la insignia visual y aumentar la confianza de los compradores.</p>
          </div>
        </div>

        {submission.success ? <KycSubmissionSuccess /> : (
          <KycDocumentForm
            documentType={submission.documentType}
            onDocumentTypeChange={submission.setDocumentType}
            documentFile={submission.documentFile}
            documentPreviewUrl={submission.documentPreviewUrl}
            selfieFile={submission.selfieFile}
            selfiePreviewUrl={submission.selfiePreviewUrl}
            loading={submission.loading}
            error={submission.error}
            onDocumentFileChange={submission.selectDocumentFile}
            onSelfieFileChange={submission.selectSelfieFile}
            onClearDocumentFile={submission.clearDocumentFile}
            onClearSelfieFile={submission.clearSelfieFile}
            onCancel={onClose}
            onSubmit={submission.submit}
          />
        )}
      </div>
    </div>
  )
}
