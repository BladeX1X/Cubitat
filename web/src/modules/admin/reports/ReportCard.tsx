import { Check, Loader2, X } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { formatDate } from '../core/formatters'
import { REASON_LABELS, REPORT_STATUS_LABELS } from '../core/constants'
import type { ModerationReport } from '../core/types'

export function ReportCard({
  report,
  actionLoading,
  onResolve,
  onDismiss,
}: {
  report: ModerationReport
  actionLoading: boolean
  onResolve: () => void
  onDismiss: () => void
}) {
  return (
    <article className="bg-white rounded-2xl shadow-[0_4px_14px_rgba(10,31,28,0.04)] border border-neutral-100 p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-100 pb-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Reporte sobre:</span>
          <h3 className="text-sm font-bold text-neutral-800 mt-0.5">
            {report.kind === 'marketplace' ? `${report.listing_type === 'service' ? 'Servicio' : 'Material'}: ${report.listing_title}` : report.properties?.title || 'Propiedad no encontrada o eliminada'}
          </h3>
        </div>
        <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${report.status === 'pending' ? 'bg-amber-100 text-amber-800' : report.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'}`}>
          {REPORT_STATUS_LABELS[report.status]}
        </span>
      </div>
      <div className="grid gap-2 text-sm text-neutral-600">
        <p><strong className="text-neutral-800">Motivo:</strong>{' '}<span className="text-red-700 font-semibold">{REASON_LABELS[report.reason] || report.reason}</span></p>
        {report.description && <p className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 text-xs italic">&quot;{report.description}&quot;</p>}
        <p className="text-xs text-neutral-400">Fecha del reporte: {formatDate(report.created_at)}</p>
      </div>
      {report.status === 'pending' && (report.kind === 'marketplace' || report.properties) && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100">
          <Button onClick={onResolve} className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white" disabled={actionLoading}>
            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} {report.kind === 'property' ? 'Ocultar Propiedad' : 'Marcar revisado'}
          </Button>
          <Button variant="outline" onClick={onDismiss} className="rounded-xl text-xs font-bold border-neutral-200 text-neutral-700" disabled={actionLoading}>
            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Descartar Reporte
          </Button>
        </div>
      )}
    </article>
  )
}
