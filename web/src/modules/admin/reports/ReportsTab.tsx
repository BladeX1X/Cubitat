import { useMemo, useState } from 'react'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '../components/AdminStates'
import { AdminNoticeDialog } from '../components/AdminNoticeDialog'
import { AdminPagination } from '../components/AdminPagination'
import { PAGE_SIZE } from '../core/constants'
import type { ReportStatusFilter } from '../core/types'
import { ReportCard } from './ReportCard'
import { useModerationReports } from './useModerationReports'

const FILTERS: Array<{ value: ReportStatusFilter; label: string }> = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'resolved', label: 'Resueltos' },
  { value: 'dismissed', label: 'Descartados' },
  { value: 'all', label: 'Todos' },
]

export function ReportsTab() {
  const state = useModerationReports()
  const [filter, setFilter] = useState<ReportStatusFilter>('pending')
  const displayed = useMemo(() => (
    filter === 'all' ? state.reports : state.reports.filter((report) => report.status === filter)
  ), [filter, state.reports])

  if (state.loading) return <AdminLoadingState message="Cargando reportes…" />
  if (state.error) return <AdminErrorState message={state.error} onRetry={() => void state.load(state.page)} />
  if (state.reports.length === 0) return <AdminEmptyState title="No hay reportes" message="No se han registrado reportes de usuarios." />

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_4px_14px_rgba(10,31,28,0.04)] flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${filter === value ? 'bg-[#035f53] text-white shadow-sm' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-4">
        {displayed.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            actionLoading={state.actionLoading === report.id}
            onResolve={() => void state.resolve(report.id)}
            onDismiss={() => void state.dismiss(report.id)}
          />
        ))}
      </div>
      {displayed.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">No hay reportes con este estado en la página actual.</div>}
      <AdminPagination page={state.page} total={state.total} pageSize={PAGE_SIZE} itemLabel="reportes" onPageChange={(page) => void state.load(page)} />
      <AdminNoticeDialog message={state.notice} onClose={state.clearNotice} />
    </div>
  )
}
