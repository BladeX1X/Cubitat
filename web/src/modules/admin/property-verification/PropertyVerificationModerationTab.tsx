import { ExternalLink, FileCheck2 } from 'lucide-react'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '../components/AdminStates'
import { AdminNoticeDialog } from '../components/AdminNoticeDialog'
import { Button } from '../../../shared/ui/button'
import { PropertyVerificationRejectDialog } from './PropertyVerificationRejectDialog'
import { usePropertyVerificationModeration } from './usePropertyVerificationModeration'

const DOCUMENT_LABELS: Record<string, string> = {
  ownership_title: 'Título o documento de propiedad',
  purchase_contract: 'Contrato de compraventa',
  other: 'Otro documento',
}

export function PropertyVerificationModerationTab() {
  const moderation = usePropertyVerificationModeration()
  if (moderation.loading) return <AdminLoadingState message="Cargando verificaciones documentales..." />
  if (moderation.error) return <AdminErrorState message={moderation.error} onRetry={moderation.loadPendingRequests} />
  if (moderation.requests.length === 0) return <AdminEmptyState title="No hay verificaciones documentales pendientes" message="Las solicitudes de propiedades aparecerán aquí para revisión AAL2." />

  return (
    <section aria-labelledby="property-verification-title" className="space-y-4">
      <div className="flex flex-col gap-1 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="property-verification-title" className="text-lg font-bold text-neutral-900">Documentos de propiedad</h2>
          <p className="text-xs text-neutral-500">Revisión interna de evidencia privada. No sustituye validación legal.</p>
        </div>
        <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{moderation.requests.length} pendientes</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {moderation.requests.map((request) => (
          <article key={request.id} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-[#035f53]" />
              <div className="min-w-0">
                <h3 className="font-bold text-neutral-900">{request.properties?.title || `Propiedad ${request.property_id.slice(0, 8)}`}</h3>
                <p className="text-xs text-neutral-500">{request.properties?.location || 'Ubicación no disponible'}</p>
                <p className="mt-2 text-xs font-semibold text-neutral-700">{DOCUMENT_LABELS[request.document_type] || request.document_type}</p>
              </div>
            </div>
            {request.notes && <p className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700">Nota: {request.notes}</p>}
            {request.trust_score && (
              <div className="rounded-lg border border-sky-100 bg-sky-50 p-3" aria-label="Indicador interno de confianza">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-sky-900">Indicador interno</p>
                  <span className="text-lg font-black text-sky-900">{request.trust_score.score}/100</span>
                </div>
                <p className="mt-1 text-[11px] text-sky-800">No es una certificación legal.</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-sky-900">
                  <span className="rounded-full bg-white/70 px-2 py-1">Identidad {request.trust_score.identity_verified ? 'verificada' : 'pendiente'}</span>
                  <span className="rounded-full bg-white/70 px-2 py-1">Documento {request.trust_score.document_verified ? 'verificado' : 'pendiente'}</span>
                  <span className="rounded-full bg-white/70 px-2 py-1">Publicada {request.trust_score.published ? 'sí' : 'no'}</span>
                  <span className="rounded-full bg-white/70 px-2 py-1">Contacto {request.trust_score.contact_present ? 'sí' : 'no'}</span>
                </div>
              </div>
            )}
            {request.signed_url ? <a className="inline-flex items-center gap-2 text-sm font-bold text-[#035f53] underline" href={request.signed_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Abrir documento privado</a> : <p className="text-xs font-semibold text-red-700">El documento privado no está disponible.</p>}
            <div className="flex gap-2 border-t border-neutral-100 pt-4">
              <Button type="button" className="flex-1" disabled={!request.signed_url || moderation.actionLoadingId === request.id} onClick={() => void moderation.approve(request)}>Aprobar</Button>
              <Button type="button" variant="outline" className="flex-1 border-red-200 text-red-700 hover:bg-red-50" disabled={moderation.actionLoadingId === request.id} onClick={() => moderation.openReject(request)}>Rechazar</Button>
            </div>
          </article>
        ))}
      </div>
      <PropertyVerificationRejectDialog request={moderation.rejectingRequest} reason={moderation.rejectionReason} isProcessing={moderation.actionLoadingId === moderation.rejectingRequest?.id} onReasonChange={moderation.setRejectionReason} onCancel={() => moderation.setRejectingRequest(null)} onConfirm={() => void moderation.confirmReject()} />
      <AdminNoticeDialog message={moderation.notice} onClose={() => moderation.setNotice(null)} />
    </section>
  )
}
