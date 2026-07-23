import { Calendar, Check, ExternalLink, FileText, Loader2, User, X } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import type { PendingKycRequest } from './kycAdminRepository'

const DOC_TYPE_LABELS: Record<string, string> = {
  identity_card: 'Carné de Identidad',
  license: 'Licencia de Conducir',
  passport: 'Pasaporte',
}

interface KycRequestCardProps {
  request: PendingKycRequest
  isProcessing: boolean
  onApprove: (request: PendingKycRequest) => void
  onReject: (request: PendingKycRequest) => void
}

export function KycRequestCard({ request, isProcessing, onApprove, onReject }: KycRequestCardProps) {
  const documentLabel = DOC_TYPE_LABELS[request.document_type] || request.document_type
  const userName = request.full_name || request.profiles?.full_name || 'Sin nombre registrado'
  const userEmail = request.email || request.profiles?.email || 'Sin correo'
  const createdDate = new Date(request.created_at).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <User className="h-4 w-4 shrink-0 text-[#035f53]" /><span className="truncate">{userName}</span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500 truncate">{userEmail}</p>
          </div>
          <span className="shrink-0 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-700 border border-neutral-200">{documentLabel}</span>
        </div>

        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-neutral-400" /><span>{createdDate}</span></div>
          <div className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-neutral-400" /><span className="capitalize">{request.document_type}</span></div>
        </div>

        <div className="relative group overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
          {request.document_signed_url ? (
            <>
              <img src={request.document_signed_url} alt={`Documento ${documentLabel} de ${userName}`} className="h-48 w-full object-contain p-2" />
              <a href={request.document_signed_url} target="_blank" rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-xs gap-1.5">
                <ExternalLink className="h-4 w-4" />Ver documento completo
              </a>
            </>
          ) : (
            <p className="flex h-48 items-center justify-center p-4 text-center text-xs font-semibold text-red-700">El documento privado no está disponible. Recarga antes de moderar.</p>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 border-t border-neutral-100 pt-4">
        <Button type="button" disabled={isProcessing || !request.document_signed_url} onClick={() => onApprove(request)}
          className="flex-1 rounded-xl bg-[#035f53] text-white hover:bg-[#024a41] text-xs font-bold py-2.5 flex items-center justify-center gap-1.5">
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" />Aprobar</>}
        </Button>
        <Button type="button" variant="outline" disabled={isProcessing} onClick={() => onReject(request)}
          className="flex-1 rounded-xl border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold py-2.5 flex items-center justify-center gap-1.5">
          <X className="h-4 w-4" />Rechazar
        </Button>
      </div>
    </div>
  )
}
