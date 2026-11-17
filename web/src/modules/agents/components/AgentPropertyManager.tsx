import { Building2, ExternalLink, Eye, Loader2, MapPin, MessageCircle, PauseCircle, Pencil, Phone, PlayCircle, Search } from 'lucide-react'
import { getPropertyStatusConfig } from '../../properties/propertyStatus'
import { Button } from '../../../shared/ui/button'
import { Input } from '../../../shared/ui/input'
import type { AgentDashboardProperty } from '../agentDashboardRepository'
import type { AgentStatusFilter } from '../hooks/useAgentDashboard'
import { getPropertyCoverImage } from '../../properties/utils/images'
import { formatPrice } from '../../../shared/lib/formatPrice'

interface AgentPropertyManagerProps {
  properties: AgentDashboardProperty[]
  filteredProperties: AgentDashboardProperty[]
  loading: boolean
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  statusFilter: AgentStatusFilter
  onStatusFilterChange: (value: AgentStatusFilter) => void
  updatingId: string | null
  actionMessage: { type: 'success' | 'error'; text: string } | null
  onToggleVisibility: (property: AgentDashboardProperty) => void
  onEditProperty?: (propertyId: string) => void
  onSelectProperty?: (propertyId: string) => void
}

export function AgentPropertyManager(props: AgentPropertyManagerProps) {
  const pausedCount = props.properties.filter(
    (property) => property.status === 'paused' || property.status === 'owner_hidden',
  ).length
  const activeCount = props.properties.filter((property) => property.status === 'published').length

  return (
    <section className="mt-8 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-lg font-black text-neutral-900">Publicaciones del Agente</h2>
          <p className="text-xs font-medium text-neutral-500">Gestiona el estado y realiza acciones rápidas en tu catálogo inmobiliario.</p>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input type="text" placeholder="Buscar por título o zona..." value={props.searchQuery}
              onChange={(event) => props.onSearchQueryChange(event.target.value)}
              className="h-11 rounded-full pl-9 pr-4 text-xs" />
          </div>
          <div className="grid grid-cols-3 items-center gap-1.5 rounded-2xl border border-neutral-200 bg-neutral-50 p-1 sm:flex sm:rounded-full">
            {([
              ['all', `Todas (${props.properties.length})`],
              ['published', `Activas (${activeCount})`],
              ['paused', `Pausadas (${pausedCount})`],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => props.onStatusFilterChange(value)}
                className={`min-h-11 rounded-full px-2 py-2 text-xs font-bold transition-all sm:px-3 ${props.statusFilter === value ? 'bg-[#035f53] text-white shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {props.actionMessage && (
        <div role={props.actionMessage.type === 'error' ? 'alert' : 'status'}
          className={`mt-4 rounded-xl border p-3 text-xs font-bold ${props.actionMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {props.actionMessage.text}
        </div>
      )}

      {props.loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#035f53]" />
          <p className="text-xs font-bold text-neutral-500">Cargando publicaciones del agente...</p>
        </div>
      ) : props.filteredProperties.length === 0 ? (
        <div className="my-8 rounded-xl border border-dashed border-neutral-200 py-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-neutral-300 mb-3" />
          <p className="text-sm font-bold text-neutral-700">No se encontraron publicaciones</p>
          <p className="mt-1 text-xs text-neutral-400">
            {props.searchQuery || props.statusFilter !== 'all' ? 'Intenta ajustar los criterios de búsqueda o el filtro de estado.' : 'Aún no tienes inmuebles registrados como agente.'}
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <table className="block w-full text-left lg:table lg:border-collapse">
            <thead className="hidden lg:table-header-group"><tr className="border-b border-neutral-100 text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
              <th className="py-3 px-4">Inmueble</th><th className="py-3 px-4">Precio</th><th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-center">Interacciones</th><th className="py-3 px-4 text-right">Acciones Rápidas</th>
            </tr></thead>
            <tbody className="grid gap-4 text-sm lg:table-row-group lg:divide-y lg:divide-neutral-100">
              {props.filteredProperties.map((property) => {
                const status = getPropertyStatusConfig(property.status)
                const isUpdating = props.updatingId === property.id
                const isPublished = property.status === 'published'
                const canToggle = isPublished || property.status === 'owner_hidden'
                const totalPhone = property.phone_clicks_count ?? '—'
                const totalWhatsApp = property.whatsapp_clicks_count ?? '—'
                return (
                  <tr key={property.id} className="grid grid-cols-2 gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:bg-neutral-50/70 lg:table-row lg:rounded-none lg:border-0 lg:p-0 lg:shadow-none">
                    <td className="col-span-2 block p-0 lg:table-cell lg:px-4 lg:py-4"><div className="flex items-center gap-3">
                      <img src={getPropertyCoverImage(property.cover_image)} alt={property.title} className="h-16 w-20 shrink-0 rounded-lg border border-neutral-200/60 bg-neutral-100 object-cover lg:h-12 lg:w-16" />
                      <div className="min-w-0"><p className="font-bold text-neutral-900 line-clamp-1">{property.title}</p>
                        <p className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5"><MapPin size={12} className="shrink-0 text-neutral-400" /><span className="truncate">{property.location}</span></p>
                      </div></div></td>
                    <td className="block p-0 font-extrabold text-[#035f53] lg:table-cell lg:whitespace-nowrap lg:px-4 lg:py-4">
                      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 lg:hidden">Precio</span>
                      {formatPrice(property.price_usd, property.price_currency ?? 'USD')}
                    </td>
                    <td className="block p-0 lg:table-cell lg:whitespace-nowrap lg:px-4 lg:py-4">
                      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 lg:hidden">Estado</span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span>
                    </td>
                    <td className="col-span-2 block p-0 lg:table-cell lg:whitespace-nowrap lg:px-4 lg:py-4 lg:text-center">
                      <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 lg:hidden">Interacciones</span>
                      <div className="flex items-center justify-start gap-2 lg:justify-center lg:gap-1.5">
                        <span className="inline-flex items-center gap-1 font-bold text-neutral-700 bg-neutral-100/80 px-2 py-1 rounded-md text-xs" title="Vistas totales acumuladas">
                          <Eye size={13} className="text-neutral-400" />
                          {property.view_count ?? 0}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded-md text-xs" title="Llamadas por teléfono">
                          <Phone size={13} className="text-blue-500" />
                          {totalPhone}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md text-xs" title="Consultas por WhatsApp">
                          <MessageCircle size={13} className="text-emerald-500" />
                          {totalWhatsApp}
                        </span>
                      </div>
                    </td>
                    <td className="col-span-2 block p-0 lg:table-cell lg:whitespace-nowrap lg:px-4 lg:py-4 lg:text-right"><div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:items-center lg:justify-end">
                      <Button variant="outline" size="sm" className="h-11 w-full rounded-lg border-neutral-200 text-xs font-bold text-[#035f53] hover:bg-[#035f53]/10 lg:h-9 lg:w-auto" onClick={() => props.onSelectProperty?.(property.id)} title="Ver cómo otros ven esta propiedad"><ExternalLink size={13} /><span>Ver cómo otros lo ven</span></Button>
                      <Button variant="outline" size="sm" className="h-11 w-full rounded-lg border-neutral-200 text-xs font-bold lg:h-9 lg:w-auto" onClick={() => props.onEditProperty?.(property.id)} title="Editar propiedad"><Pencil size={13} /><span>Editar</span></Button>
                      {canToggle ? (
                        <Button variant="outline" size="sm" className={`h-11 w-full rounded-lg text-xs font-bold transition-colors lg:h-9 lg:w-auto ${isPublished ? 'border-amber-200 text-amber-800 hover:bg-amber-50' : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'}`}
                          disabled={isUpdating} onClick={() => props.onToggleVisibility(property)} title={isPublished ? 'Pausar publicación' : 'Reactivar publicación'}>
                          {isUpdating ? <Loader2 size={13} className="animate-spin" /> : isPublished ? <PauseCircle size={13} /> : <PlayCircle size={13} />}
                          <span>{isPublished ? 'Ocultar' : 'Reactivar'}</span>
                        </Button>
                      ) : <span className="text-xs font-semibold text-neutral-500">Gestionada por moderación</span>}
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
