import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '../components/AdminStates'
import { AdminNoticeDialog } from '../components/AdminNoticeDialog'
import { KycRejectDialog } from './KycRejectDialog'
import { KycRequestCard } from './KycRequestCard'
import { useKycModeration } from './useKycModeration'

export function KycModerationTab() {
  const moderation = useKycModeration()

  if (moderation.loading) {
    return <AdminLoadingState message="Cargando solicitudes KYC pendientes..." />
  }
  if (moderation.error) {
    return <AdminErrorState message={moderation.error} onRetry={moderation.loadPendingRequests} />
  }
  if (moderation.requests.length === 0) {
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
          <h2 id="kyc-moderation-title" className="text-lg font-bold text-neutral-900">Verificación de Identidad (KYC)</h2>
          <p className="text-xs text-neutral-500">Revisa los documentos presentados por los usuarios para validar su identidad.</p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
          {moderation.requests.length} {moderation.requests.length === 1 ? 'pendiente' : 'pendientes'}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {moderation.requests.map((request) => (
          <KycRequestCard
            key={request.id}
            request={request}
            isProcessing={moderation.actionLoadingId === request.id}
            onApprove={(item) => void moderation.approve(item)}
            onReject={moderation.openReject}
          />
        ))}
      </div>

      <KycRejectDialog
        request={moderation.rejectingRequest}
        reason={moderation.rejectionReason}
        isProcessing={moderation.actionLoadingId === moderation.rejectingRequest?.id}
        onReasonChange={moderation.setRejectionReason}
        onCancel={() => moderation.setRejectingRequest(null)}
        onConfirm={() => void moderation.confirmReject()}
      />
      <AdminNoticeDialog message={moderation.notice} onClose={() => moderation.setNotice(null)} />
    </section>
  )
}
