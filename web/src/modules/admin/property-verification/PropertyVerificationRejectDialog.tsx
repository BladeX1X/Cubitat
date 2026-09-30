import { Button } from '../../../shared/ui/button'
import type { PendingPropertyVerification } from './propertyVerificationRepository'

export function PropertyVerificationRejectDialog({
  request, reason, isProcessing, onReasonChange, onCancel, onConfirm,
}: {
  request: PendingPropertyVerification | null
  reason: string
  isProcessing: boolean
  onReasonChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!request) return null
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="property-verification-reject-title">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h2 id="property-verification-reject-title" className="text-lg font-bold text-neutral-900">Rechazar documento</h2>
        <p className="mt-1 text-xs text-neutral-500">El motivo queda registrado para el propietario.</p>
        <textarea autoFocus className="mt-4 min-h-24 w-full rounded-lg border border-neutral-200 p-3 text-sm" value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder="Escribe el motivo del rechazo" aria-label="Motivo del rechazo" />
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isProcessing}>Cancelar</Button>
          <Button type="button" onClick={onConfirm} disabled={isProcessing || !reason.trim()} className="bg-red-700 hover:bg-red-800">Rechazar</Button>
        </div>
      </div>
    </div>
  )
}
