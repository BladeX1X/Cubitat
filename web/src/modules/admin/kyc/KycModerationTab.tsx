import { useCallback, useEffect, useState } from 'react'
import { Check, X, ExternalLink, User, Calendar, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '../components/AdminStates'
import { AdminNoticeDialog } from '../components/AdminNoticeDialog'
import { Button } from '../../../shared/ui/button'
import { fetchPendingKycRequests, reviewKycRequest, type PendingKycRequest } from './kycAdminRepository'

const DOC_TYPE_LABELS: Record<string, string> = {
  identity_card: 'Carné de Identidad',
  license: 'Licencia de Conducir',
  passport: 'Pasaporte',
}

export function KycModerationTab() {
  const [requests, setRequests] = useState<PendingKycRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [rejectingRequest, setRejectingRequest] = useState<PendingKycRequest | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const loadPendingRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPendingKycRequests()
      setRequests(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar las solicitudes KYC pendientes.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPendingRequests()
  }, [loadPendingRequests])

  const handleApprove = async (request: PendingKycRequest) => {
    setActionLoadingId(request.id)
    try {
      await reviewKycRequest(request.id, 'approved')
      setRequests((prev) => prev.filter((r) => r.id !== request.id))
      setNotice('Solicitud KYC aprobada exitosamente.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al aprobar la solicitud KYC.'
      setNotice(message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleOpenRejectModal = (request: PendingKycRequest) => {
    setRejectingRequest(request)
    setRejectionReason('')
  }

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return
    const requestId = rejectingRequest.id
    setActionLoadingId(requestId)
    try {
      await reviewKycRequest(requestId, 'rejected', rejectionReason.trim() || undefined)
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      setRejectingRequest(null)
      setRejectionReason('')
      setNotice('Solicitud KYC rechazada exitosamente.')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al rechazar la solicitud KYC.'
      setNotice(message)
    } finally {
      setActionLoadingId(null)
    }
  }

  if (loading) return <AdminLoadingState message="Cargando solicitudes KYC pendientes..." />
  if (error) return <AdminErrorState message={error} onRetry={loadPendingRequests} />
  if (requests.length === 0) {
    return (
      <AdminEmptyState
        title="No hay solicitudes KYC pendientes"
        message="Todas las verificaciones de identidad han sido procesadas."
      />
    )
  }

  return (
    <section aria-labelledby="kyc-moderation-title" className="space-y-4">
      <div className="flex flex-col gap-1 rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_4px_14px_rgba(10,31,28,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="kyc-moderation-title" className="text-lg font-bold text-neutral-900">
            Verificación de Identidad (KYC)
          </h2>
          <p className="text-xs text-neutral-500">
            Revisa los documentos presentados por los usuarios para validar su identidad.
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
          {requests.length} {requests.length === 1 ? 'pendiente' : 'pendientes'}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {requests.map((req) => {
          const docLabel = DOC_TYPE_LABELS[req.document_type] || req.document_type
          const isProcessing = actionLoadingId === req.id
          const userName = req.full_name || req.profiles?.full_name || 'Sin nombre registrado'
          const userEmail = req.email || req.profiles?.email || 'Sin correo'
          const createdDate = new Date(req.created_at).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })

          return (
            <div
              key={req.id}
              className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                      <User className="h-4 w-4 shrink-0 text-[#035f53]" />
                      <span className="truncate">{userName}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500 truncate">{userEmail}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-700 border border-neutral-200">
                    {docLabel}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                    <span>{createdDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-neutral-400" />
                    <span className="capitalize">{req.document_type}</span>
                  </div>
                </div>

                <div className="relative group overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                  <img
                    src={req.document_url}
                    alt={`Documento ${docLabel} de ${userName}`}
                    className="h-48 w-full object-contain p-2"
                  />
                  <a
                    href={req.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-xs gap-1.5"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver documento completo
                  </a>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 border-t border-neutral-100 pt-4">
                <Button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => void handleApprove(req)}
                  className="flex-1 rounded-xl bg-[#035f53] text-white hover:bg-[#024a41] text-xs font-bold py-2.5 flex items-center justify-center gap-1.5"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Aprobar
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isProcessing}
                  onClick={() => handleOpenRejectModal(req)}
                  className="flex-1 rounded-xl border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold py-2.5 flex items-center justify-center gap-1.5"
                >
                  <X className="h-4 w-4" />
                  Rechazar
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {rejectingRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fadeIn"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h3 id="reject-modal-title" className="text-base font-bold text-neutral-900">
                Rechazar solicitud KYC
              </h3>
            </div>

            <p className="text-xs text-neutral-600">
              Estás a punto de rechazar la verificación de identidad para{' '}
              <strong className="text-neutral-900">
                {rejectingRequest.full_name || rejectingRequest.email || rejectingRequest.user_id}
              </strong>
              . Escribe el motivo para notificar al usuario.
            </p>

            <div>
              <label htmlFor="rejection-reason-input" className="block text-xs font-bold text-neutral-700 mb-1">
                Motivo del rechazo
              </label>
              <textarea
                id="rejection-reason-input"
                rows={3}
                className="w-full rounded-xl border border-neutral-300 p-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-[#035f53] focus:outline-none focus:ring-1 focus:ring-[#035f53]"
                placeholder="Ej. El documento de identidad se encuentra borroso o vencido."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={actionLoadingId === rejectingRequest.id}
                onClick={() => setRejectingRequest(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                disabled={actionLoadingId === rejectingRequest.id}
                onClick={() => void handleConfirmReject()}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 flex items-center gap-1.5"
              >
                {actionLoadingId === rejectingRequest.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Confirmar rechazo'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AdminNoticeDialog message={notice} onClose={() => setNotice(null)} />
    </section>
  )
}
