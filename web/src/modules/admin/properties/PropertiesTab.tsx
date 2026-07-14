import { useMemo, useState } from 'react'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '../components/AdminStates'
import { AdminNoticeDialog } from '../components/AdminNoticeDialog'
import { AdminPagination } from '../components/AdminPagination'
import { PAGE_SIZE, STATUS_FILTERS } from '../core/constants'
import type { StatusFilter } from '../core/types'
import { PropertyModerationCard } from './PropertyModerationCard'
import { useModerationProperties } from './useModerationProperties'

export function PropertiesTab() {
  const state = useModerationProperties()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const displayed = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return state.properties
    return state.properties.filter((property) => [
      property.title, property.location, property.user_email, property.operation, property.property_type,
    ].join(' ').toLowerCase().includes(query))
  }, [searchQuery, state.properties])

  if (state.loading) return <AdminLoadingState message="Cargando propiedades…" />
  if (state.error) return <AdminErrorState message={state.error} onRetry={() => void state.load(state.page)} />
  if (state.properties.length === 0 && state.total === 0 && state.statusCounts.all === 0) {
    return <AdminEmptyState title="No hay propiedades" message="Aún no hay publicaciones para moderar." />
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_4px_14px_rgba(10,31,28,0.04)] space-y-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button key={value} type="button" onClick={() => state.setStatusFilter(value as StatusFilter)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${state.statusFilter === value ? 'bg-[#035f53] text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
              {label} ({state.statusCounts[value]})
            </button>
          ))}
        </div>
        <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar por título, ubicación, anunciante, operación o tipo..." className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-[#035f53] focus:ring-2 focus:ring-[#035f53]/10" />
        <p className="text-xs text-neutral-500">Mostrando <span className="font-bold text-neutral-800">{displayed.length}</span> resultado(s)</p>
      </div>
      {displayed.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">No hay propiedades que coincidan con estos filtros.</div>}
      {displayed.map((property) => (
        <PropertyModerationCard
          key={property.id}
          property={property}
          expanded={selectedId === property.id}
          actionLoading={state.actionLoading === property.id}
          onToggle={() => setSelectedId((current) => current === property.id ? null : property.id)}
          onApprove={() => void state.changeStatus(property.id, 'published')}
          onReject={() => {
            const reason = window.prompt('Escribe el motivo del rechazo. El usuario lo verá en su propiedad.')?.trim()
            if (reason) void state.changeStatus(property.id, 'paused', reason)
          }}
          onReevaluate={() => void state.reevaluate(property)}
          onDelete={() => {
            if (window.confirm('¿Eliminar esta propiedad? Esta acción no se puede deshacer.')) void state.remove(property.id)
          }}
        />
      ))}
      <AdminPagination page={state.page} total={state.total} pageSize={PAGE_SIZE} itemLabel="propiedades" onPageChange={(page) => void state.load(page)} />
      <AdminNoticeDialog message={state.notice} onClose={state.clearNotice} />
    </div>
  )
}
