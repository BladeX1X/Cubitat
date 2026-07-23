import { ShieldCheck, X } from 'lucide-react'
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
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submission.loading) onClose()
      }}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button onClick={onClose} disabled={submission.loading}
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
            file={submission.file}
            previewUrl={submission.previewUrl}
            loading={submission.loading}
            error={submission.error}
            onFileChange={submission.selectFile}
            onClearFile={submission.clearFile}
            onCancel={onClose}
            onSubmit={submission.submit}
          />
        )}
      </div>
    </div>
  )
}
