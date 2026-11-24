import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../shared/ui/select'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '../components/AdminStates'
import { AdminNoticeDialog } from '../components/AdminNoticeDialog'
import { AdminPagination } from '../components/AdminPagination'
import { IMAGE_DUPLICATE_FILTER, PAGE_SIZE, STATUS_FILTERS } from '../core/constants'
import { IMAGE_DUPLICATE_MODERATION_ENABLED } from '../../../shared/config/features'
import type { PropertyModerationFilters } from '../core/types'
import { PropertyModerationCard } from './PropertyModerationCard'
import { useModerationProperties } from './useModerationProperties'

const OPERATION_OPTIONS = [
  { value: 'all', label: 'Todas las operaciones' },
  { value: 'venta', label: 'Venta' },
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'permuta', label: 'Permuta' },
] as const

const PROPERTY_TYPE_OPTIONS = [
  { value: 'all', label: 'Todos los inmuebles' },
  { value: 'casa', label: 'Casa' },
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'terreno', label: 'Terreno' },
] as const

function getLabel(options: ReadonlyArray<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

function countActiveFilters(filters: PropertyModerationFilters) {
  return [
    filters.query.trim(),
    filters.operation !== 'all',
    filters.propertyType !== 'all',
    filters.createdAfter,
    filters.createdBefore,
  ].filter(Boolean).length
}

function hasInvalidDateRange(filters: PropertyModerationFilters) {
  return Boolean(filters.createdAfter && filters.createdBefore && filters.createdAfter > filters.createdBefore)
}

export function PropertiesTab() {
  const state = useModerationProperties()
  const { applyFilters, draftFilters, filters, statusFilter } = state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const activeFilterCount = countActiveFilters(state.filters)
  const invalidDateRange = hasInvalidDateRange(state.draftFilters)
  const resultStart = state.total === 0 ? 0 : state.page * PAGE_SIZE + 1
  const resultEnd = Math.min((state.page + 1) * PAGE_SIZE, state.total)

  useEffect(() => {
    if (
      statusFilter === 'image_duplicates'
      || draftFilters.query === filters.query
      || hasInvalidDateRange(draftFilters)
    ) return
    const timeout = window.setTimeout(() => applyFilters(draftFilters), 350)
    return () => window.clearTimeout(timeout)
  }, [applyFilters, draftFilters, filters.query, statusFilter])

  function updateAndApplyFilters(updates: Partial<PropertyModerationFilters>) {
    const nextFilters = { ...state.draftFilters, ...updates }
    state.updateDraftFilters(updates)
    if (!hasInvalidDateRange(nextFilters)) state.applyFilters(nextFilters)
  }

  if (state.loading) return <AdminLoadingState message="Cargando propiedades…" />
  if (state.error) return <AdminErrorState message={state.error} onRetry={() => void state.load(state.page)} />
  if (state.properties.length === 0 && state.total === 0 && state.statusCounts.all === 0) {
    return <AdminEmptyState title="No hay propiedades" message="Aún no hay publicaciones para moderar." />
  }

  return (
    <div className="space-y-4">
      {state.warning && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {state.warning} Puedes seguir revisando las publicaciones.
        </p>
      )}
      <div className="space-y-4 rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_4px_14px_rgba(10,31,28,0.04)]">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button key={value} type="button" onClick={() => state.setStatusFilter(value)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${state.statusFilter === value ? 'bg-[#035f53] text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
              {label} ({state.statusCounts[value]})
            </button>
          ))}
          {IMAGE_DUPLICATE_MODERATION_ENABLED && (
            <button key={IMAGE_DUPLICATE_FILTER.value} type="button" onClick={() => state.setStatusFilter(IMAGE_DUPLICATE_FILTER.value)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${state.statusFilter === IMAGE_DUPLICATE_FILTER.value ? 'bg-violet-700 text-white' : 'bg-violet-50 text-violet-800 hover:bg-violet-100'}`}>
              {IMAGE_DUPLICATE_FILTER.label} ({state.statusCounts.image_duplicates ?? 0})
            </button>
          )}
        </div>

        {state.statusFilter === 'image_duplicates' ? (
          <p className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-sm text-violet-900">
            Esta vista ya muestra únicamente publicaciones con posibles coincidencias de imagen.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <label className="space-y-1.5 sm:col-span-2 xl:col-span-2">
              <span className="text-xs font-semibold text-neutral-700">Título o ubicación</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-neutral-400" aria-hidden="true" />
                <Input
                  type="search"
                  maxLength={100}
                  value={state.draftFilters.query}
                  onChange={(event) => state.updateDraftFilters({ query: event.target.value })}
                  placeholder="Ej. casa en Holguín"
                  className="pl-9"
                />
              </span>
            </label>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-neutral-700">Operación</span>
              <Select
                value={state.draftFilters.operation}
                onValueChange={(value) => updateAndApplyFilters({ operation: value as PropertyModerationFilters['operation'] })}
              >
                <SelectTrigger aria-label="Filtrar por operación">
                  <SelectValue>{getLabel(OPERATION_OPTIONS, state.draftFilters.operation)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {OPERATION_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-neutral-700">Inmueble</span>
              <Select
                value={state.draftFilters.propertyType}
                onValueChange={(value) => updateAndApplyFilters({ propertyType: value as PropertyModerationFilters['propertyType'] })}
              >
                <SelectTrigger aria-label="Filtrar por tipo de inmueble">
                  <SelectValue>{getLabel(PROPERTY_TYPE_OPTIONS, state.draftFilters.propertyType)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-neutral-700">Desde</span>
              <Input type="date" value={state.draftFilters.createdAfter} onChange={(event) => updateAndApplyFilters({ createdAfter: event.target.value })} aria-label="Fecha inicial" />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-neutral-700">Hasta</span>
              <Input type="date" value={state.draftFilters.createdBefore} onChange={(event) => updateAndApplyFilters({ createdBefore: event.target.value })} aria-label="Fecha final" />
            </label>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-6">
              <Button type="button" variant="ghost" onClick={state.clearFilters} disabled={activeFilterCount === 0 && countActiveFilters(state.draftFilters) === 0}>
                Limpiar
              </Button>
              {activeFilterCount > 0 && <span className="text-xs text-neutral-500">{activeFilterCount} filtro(s) aplicado(s)</span>}
              {invalidDateRange && <span role="alert" className="text-xs text-red-700">La fecha inicial debe ser anterior o igual a la fecha final.</span>}
              <span className="text-xs text-neutral-500">Los filtros se aplican automáticamente; la búsqueda se actualiza al terminar de escribir.</span>
            </div>
          </div>
        )}
        <p className="text-xs text-neutral-500" aria-live="polite">
          Mostrando <span className="font-bold text-neutral-800">{resultStart}{state.total > 0 ? `–${resultEnd}` : ''}</span> de <span className="font-bold text-neutral-800">{state.total}</span> publicación(es)
          {activeFilterCount > 0 ? ' que coinciden con los filtros' : ''}.
        </p>
      </div>

      {state.properties.length === 0 ? (
        <AdminEmptyState title="Sin coincidencias" message="No hay publicaciones que coincidan con estos filtros." />
      ) : (
        state.properties.map((property) => (
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
            onHide={() => {
              const reason = window.prompt('Escribe el motivo del ocultamiento. El propietario lo verá en su publicación.')?.trim()
              if (reason) void state.hide(property.id, reason)
            }}
            onRestore={() => {
              if (window.confirm('¿Volver a publicar esta propiedad ocultada por moderación?')) void state.restore(property.id)
            }}
            onReevaluate={() => void state.reevaluate(property)}
            onDelete={() => {
              if (window.confirm('¿Eliminar esta propiedad? Esta acción no se puede deshacer.')) void state.remove(property.id)
            }}
          />
        ))
      )}
      <AdminPagination page={state.page} total={state.total} pageSize={PAGE_SIZE} itemLabel="propiedades" onPageChange={(page) => void state.load(page)} />
      <AdminNoticeDialog message={state.notice} onClose={state.clearNotice} />
    </div>
  )
}
