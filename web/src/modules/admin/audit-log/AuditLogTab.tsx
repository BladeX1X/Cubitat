import { Search } from 'lucide-react'
import { Input } from '../../../shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../shared/ui/select'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '../components/AdminStates'
import { AdminPagination } from '../components/AdminPagination'
import { PAGE_SIZE } from '../core/constants'
import { AuditLogCard } from './AuditLogCard'
import type { AuditActionFilter, AuditSourceFilter } from './types'
import { useAuditLog } from './useAuditLog'

const ACTION_OPTIONS: ReadonlyArray<{ value: AuditActionFilter; label: string }> = [
  { value: 'all', label: 'Todas las acciones' },
  { value: 'update', label: 'Actualización' },
  { value: 'delete', label: 'Eliminación' },
]
const SOURCE_OPTIONS: ReadonlyArray<{ value: AuditSourceFilter; label: string }> = [
  { value: 'all', label: 'Todos los orígenes' },
  { value: 'admin', label: 'Administrador' },
  { value: 'owner', label: 'Propietario' },
  { value: 'automation', label: 'Automatización' },
  { value: 'system', label: 'Sistema' },
]

function optionLabel<T extends string>(options: ReadonlyArray<{ value: T; label: string }>, value: T) {
  return options.find((option) => option.value === value)?.label ?? value
}

export function AuditLogTab() {
  const state = useAuditLog()

  if (state.loading) return <AdminLoadingState message="Cargando bitácora…" />
  if (state.error) return <AdminErrorState message={state.error} onRetry={() => void state.load(state.page)} />

  return (
    <section aria-labelledby="audit-log-title" className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 id="audit-log-title" className="text-lg font-bold text-neutral-900">Bitácora de moderación</h2>
        <p className="mt-1 text-sm text-neutral-500">Evidencia de solo lectura sobre cambios y eliminaciones de propiedades.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="relative">
            <span className="sr-only">Buscar propiedad</span>
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-neutral-400" aria-hidden="true" />
            <Input type="search" className="rounded-lg pl-9" placeholder="Buscar propiedad…" value={state.filters.query} onChange={(event) => state.setQuery(event.target.value)} />
          </label>
          <Select value={state.filters.action} onValueChange={(value) => state.setAction(value as AuditActionFilter)}>
            <SelectTrigger className="rounded-lg" aria-label="Filtrar por acción">
              <SelectValue>{optionLabel(ACTION_OPTIONS, state.filters.action)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={state.filters.source} onValueChange={(value) => state.setSource(value as AuditSourceFilter)}>
            <SelectTrigger className="rounded-lg" aria-label="Filtrar por origen">
              <SelectValue>{optionLabel(SOURCE_OPTIONS, state.filters.source)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {state.events.length === 0 ? (
        <AdminEmptyState title="Sin eventos" message="No hay evidencia que coincida con los filtros seleccionados." />
      ) : (
        <div className="grid gap-4">
          {state.events.map((event) => <AuditLogCard key={event.id} event={event} />)}
        </div>
      )}

      <AdminPagination page={state.page} total={state.total} pageSize={PAGE_SIZE} itemLabel="eventos" onPageChange={(page) => void state.load(page)} />
    </section>
  )
}
