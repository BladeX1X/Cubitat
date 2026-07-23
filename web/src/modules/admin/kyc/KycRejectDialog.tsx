import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import type { PendingKycRequest } from './kycAdminRepository'

interface KycRejectDialogProps {
  request: PendingKycRequest | null
  reason: string
  isProcessing: boolean
  onReasonChange: (reason: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export function KycRejectDialog({ request, reason, isProcessing, onReasonChange, onCancel, onConfirm }: KycRejectDialogProps) {
  if (!request) return null

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="reject-modal-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <h3 id="reject-modal-title" className="text-base font-bold text-neutral-900">Rechazar solicitud KYC</h3>
        </div>
        <p className="text-xs text-neutral-600">
          Estás a punto de rechazar la verificación de identidad para{' '}
          <strong className="text-neutral-900">{request.full_name || request.email || request.user_id}</strong>. Escribe el motivo para notificar al usuario.
        </p>
        <div>
          <label htmlFor="rejection-reason-input" className="block text-xs font-bold text-neutral-700 mb-1">Motivo del rechazo</label>
          <textarea id="rejection-reason-input" rows={3} className="w-full rounded-xl border border-neutral-300 p-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#035f53] focus:outline-none focus:ring-1 focus:ring-[#035f53]"
            placeholder="Ej. El documento de identidad se encuentra borroso o vencido." value={reason}
            onChange={(event) => onReasonChange(event.target.value)} required />
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" disabled={isProcessing} onClick={onCancel} className="rounded-xl px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100">Cancelar</Button>
          <Button type="button" disabled={isProcessing || reason.trim().length === 0} onClick={onConfirm}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 flex items-center gap-1.5">
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar rechazo'}
          </Button>
        </div>
      </div>
    </div>
  )
}
