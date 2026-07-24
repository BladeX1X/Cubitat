import { AlertTriangle, CalendarDays, Flag, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { formatDate } from '../core/formatters'
import type { AdvertiserContext } from './types'
import { useAdvertiserContext } from './useAdvertiserContext'

const RISK_LABELS = { low: 'Sin alertas', medium: 'Atención', high: 'Revisión prioritaria' } as const

function ContextSummary({ context }: { context: AdvertiserContext }) {
  const summaries = [
    ['Cuenta', context.accountAgeDays === null ? 'Sin fecha' : `${context.accountAgeDays} días`],
    ['Publicaciones', `${context.propertyCounts.total} total · ${context.propertyCounts.published} públicas`],
    ['Reportes', `${context.reportCounts.total} total · ${context.reportCounts.pending} pendientes`],
    ['Última publicación', context.lastPropertyAt ? formatDate(context.lastPropertyAt) : 'Sin publicaciones'],
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {summaries.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-neutral-200 bg-white p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">{label}</p>
          <p className="mt-1 text-sm font-semibold text-neutral-800">{value}</p>
        </div>
      ))}
    </div>
  )
}

export function AdvertiserContextPanel({ userId }: { userId: string }) {
  const state = useAdvertiserContext(userId)
  return (
    <section aria-labelledby="advertiser-context-title" className="rounded-2xl border border-neutral-200 bg-neutral-100/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#035f53]" />
          <h4 id="advertiser-context-title" className="text-sm font-bold text-neutral-800">Contexto del anunciante</h4>
        </div>
        {state.context && (
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${state.context.riskLevel === 'high' ? 'bg-red-100 text-red-700' : state.context.riskLevel === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>
            {RISK_LABELS[state.context.riskLevel]}
          </span>
        )}
      </div>
      {state.loading && <div role="status" className="flex items-center gap-2 py-5 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando contexto…</div>}
      {state.error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{state.error}</p>
          <Button type="button" variant="outline" className="mt-2 h-8 rounded-full text-xs" onClick={() => void state.load()}>Reintentar</Button>
        </div>
      )}
      {state.context && !state.loading && (
        <div className="space-y-3">
          <ContextSummary context={state.context} />
          {state.context.signals.length > 0 ? (
            <div className="space-y-2">
              {state.context.signals.map((signal) => (
                <div key={signal.code} className={`flex gap-2 rounded-xl border p-3 text-sm ${signal.severity === 'danger' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                  {signal.code.includes('report') ? <Flag className="mt-0.5 h-4 w-4 shrink-0" /> : signal.code === 'new_account' ? <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                  <p><strong>{signal.label}:</strong> {signal.detail}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-emerald-700">Sin señales automáticas para esta cuenta.</p>}
          <p className="text-xs text-neutral-500">Señales orientativas basadas en actividad visible para administradores; siempre requieren revisión humana.</p>
        </div>
      )}
    </section>
  )
}
