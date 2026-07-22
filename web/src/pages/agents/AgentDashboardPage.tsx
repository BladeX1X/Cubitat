import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  BarChart3,
  Building2,
  Eye,
  ExternalLink,
  Loader2,
  MapPin,
  PauseCircle,
  Pencil,
  PlayCircle,
  Search,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '../../shared/lib/supabaseClient'
import { Button } from '../../shared/ui/button'
import { Input } from '../../shared/ui/input'
import { AccountLayout } from '../account/AccountLayout'
import { useSEO } from '../../shared/hooks/useSEO'
import { getPropertyStatusConfig, type PropertyStatus } from '../my-properties/propertyStatus'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'

export type AgentProperty = {
  id: string
  title: string
  location: string
  price_usd: number
  cover_image: string | null
  status: PropertyStatus
  created_at: string
  user_id: string
  view_count?: number
}

export type AgentDashboardPageProps = {
  user: User
  onNavigateAccount?: () => void
  onNavigateFavorites?: () => void
  onNavigateMyProperties?: () => void
  onNavigateAgentDashboard?: () => void
  onEditProperty?: (propertyId: string) => void
  onSelectProperty?: (propertyId: string) => void
}

function formatPrice(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;base64,' +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" fill="none">
      <rect width="400" height="240" fill="#f5f5f5"/>
      <text x="200" y="125" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#a3a3a3">Sin imagen</text>
    </svg>`,
  )

export function AgentDashboardPage({
  user,
  onNavigateAccount,
  onNavigateFavorites,
  onNavigateMyProperties,
  onNavigateAgentDashboard,
  onEditProperty,
  onSelectProperty,
}: AgentDashboardPageProps) {
  useSEO({
    title: 'Panel de Agente | Cubitat',
    description: 'Métricas de rendimiento, visualizaciones acumuladas y gestión de publicaciones de agente.',
  })

  const [properties, setProperties] = useState<AgentProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | undefined>()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'paused'>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      try {
        const [profileRes, propertiesRes] = await Promise.all([
          supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
          supabase
            .from('properties')
            .select('id, title, location, price_usd, cover_image, status, created_at, user_id, view_count')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ])

        if (!active) return

        if (profileRes.data) {
          setUserRole((profileRes.data as any).role)
        }

        if (propertiesRes.data) {
          setProperties(propertiesRes.data as AgentProperty[])
        }
      } catch (err) {
        logSafeEvent({
          module: 'agent_dashboard',
          action: 'load_dashboard_data',
          level: 'error',
          code: sanitizeErrorReason(err),
        })
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [user.id])

  // Summary Metrics calculations
  const activePropertiesCount = useMemo(() => {
    return properties.filter((p) => p.status === 'published').length
  }, [properties])

  const totalAccumulatedViews = useMemo(() => {
    return properties.reduce((sum, p) => sum + (p.view_count || 0), 0)
  }, [properties])

  const estimatedLeads = useMemo(() => {
    return Math.round(totalAccumulatedViews * 0.05)
  }, [totalAccumulatedViews])

  // Filtered Properties for table/list
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (statusFilter === 'published') return p.status === 'published'
      if (statusFilter === 'paused') return p.status === 'paused' || p.status === 'owner_hidden'

      return true
    })
  }, [properties, searchQuery, statusFilter])

  // Toggle Pause / Reactivate handler
  async function handleTogglePause(property: AgentProperty) {
    const isCurrentlyPublished = property.status === 'published'
    const nextStatus: PropertyStatus = isCurrentlyPublished ? 'paused' : 'published'
    const confirmMessage = isCurrentlyPublished
      ? '¿Deseas pausar esta publicación? Dejará de ser visible públicamente para potenciales compradores.'
      : '¿Deseas reactivar esta publicación? Volverá a estar activa y visible en el catálogo de Cubitat.'

    const confirmed = window.confirm(confirmMessage)
    if (!confirmed) return

    setUpdatingId(property.id)
    setActionMessage(null)

    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: nextStatus })
        .eq('id', property.id)
        .eq('user_id', user.id)

      if (error) throw error

      setProperties((current) =>
        current.map((p) => (p.id === property.id ? { ...p, status: nextStatus } : p)),
      )

      setActionMessage({
        type: 'success',
        text: isCurrentlyPublished
          ? 'Publicación pausada exitosamente.'
          : 'Publicación reactivada exitosamente.',
      })
    } catch (err) {
      logSafeEvent({
        module: 'agent_dashboard',
        action: 'toggle_pause_property',
        level: 'error',
        code: sanitizeErrorReason(err),
      })
      setActionMessage({
        type: 'error',
        text: 'No se pudo cambiar el estado de la publicación. Inténtalo de nuevo.',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <AccountLayout
      active="agent-dashboard"
      userRole={userRole || 'agent'}
      onNavigateAccount={onNavigateAccount || (() => {})}
      onNavigateFavorites={onNavigateFavorites || (() => {})}
      onNavigateMyProperties={onNavigateMyProperties || (() => {})}
      onNavigateAgentDashboard={onNavigateAgentDashboard || (() => {})}
    >
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#035f53] to-[#008f79] px-6 py-7 text-white shadow-sm sm:px-8 sm:py-8">
        <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
          <BarChart3 size={18} />
          <span>Dashboard de Agente</span>
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
          Métricas y Rendimiento
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-emerald-50/90 sm:text-base">
          Monitorea el impacto de tus inmuebles en tiempo real, analiza visualizaciones acumuladas y gestiona tus publicaciones rápidamente.
        </p>
      </section>

      {/* Summary Cards */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
        {/* Metric 1: Inmuebles Activos */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">
              Inmuebles Activos
            </span>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-[#035f53]">
              <Building2 size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-neutral-900" data-testid="metric-active-properties">
            {loading ? '-' : activePropertiesCount}
          </p>
          <p className="mt-1 text-xs font-semibold text-neutral-500">
            {activePropertiesCount === 1 ? '1 propiedad publicada' : `${activePropertiesCount} propiedades publicadas`}
          </p>
        </div>

        {/* Metric 2: Visualizaciones Acumuladas */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">
              Visualizaciones Acumuladas
            </span>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <Eye size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-neutral-900" data-testid="metric-total-views">
            {loading ? '-' : totalAccumulatedViews.toLocaleString('es-CU')}
          </p>
          <p className="mt-1 text-xs font-semibold text-neutral-500">
            Sumatoria total de vistas en tus publicaciones
          </p>
        </div>

        {/* Metric 3: Leads Estimados */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">
              Leads Estimados
            </span>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-neutral-900" data-testid="metric-estimated-leads">
            {loading ? '-' : estimatedLeads.toLocaleString('es-CU')}
          </p>
          <p className="mt-1 text-xs font-semibold text-neutral-500">
            Contactos estimados (~5% conv. por vistas)
          </p>
        </div>
      </section>

      {/* Main Interactive Table / List Section */}
      <section className="mt-8 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-neutral-900">
              Publicaciones del Agente
            </h2>
            <p className="text-xs font-medium text-neutral-500">
              Gestiona el estado y realiza acciones rápidas en tu catálogo inmobiliario.
            </p>
          </div>

          {/* Controls: Search and Status Filters */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                type="text"
                placeholder="Buscar por título o zona..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-full pl-9 pr-4 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 p-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-[#035f53] text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Todas ({properties.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('published')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                  statusFilter === 'published'
                    ? 'bg-[#035f53] text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Activas ({properties.filter((p) => p.status === 'published').length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('paused')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                  statusFilter === 'paused'
                    ? 'bg-[#035f53] text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Pausadas ({properties.filter((p) => p.status === 'paused' || p.status === 'owner_hidden').length})
              </button>
            </div>
          </div>
        </div>

        {actionMessage && (
          <div
            role={actionMessage.type === 'error' ? 'alert' : 'status'}
            className={`mt-4 rounded-xl border p-3 text-xs font-bold ${
              actionMessage.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        {/* Content Table / Cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#035f53]" />
            <p className="text-xs font-bold text-neutral-500">Cargando publicaciones del agente...</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="my-8 rounded-xl border border-dashed border-neutral-200 py-12 text-center">
            <Building2 className="mx-auto h-12 w-12 text-neutral-300 mb-3" />
            <p className="text-sm font-bold text-neutral-700">
              No se encontraron publicaciones
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              {searchQuery || statusFilter !== 'all'
                ? 'Intenta ajustar los criterios de búsqueda o el filtro de estado.'
                : 'Aún no tienes inmuebles registrados como agente.'}
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
                  <th className="py-3 px-4">Inmueble</th>
                  <th className="py-3 px-4">Precio</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-center">Visualizaciones</th>
                  <th className="py-3 px-4 text-right">Acciones Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {filteredProperties.map((prop) => {
                  const statusCfg = getPropertyStatusConfig(prop.status)
                  const isUpdating = updatingId === prop.id
                  const isPublished = prop.status === 'published'

                  return (
                    <tr key={prop.id} className="hover:bg-neutral-50/70 transition-colors">
                      {/* Title & Cover */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={prop.cover_image || PLACEHOLDER_IMAGE}
                            alt={prop.title}
                            className="h-12 w-16 rounded-lg object-cover bg-neutral-100 border border-neutral-200/60 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-neutral-900 line-clamp-1">
                              {prop.title}
                            </p>
                            <p className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5">
                              <MapPin size={12} className="shrink-0 text-neutral-400" />
                              <span className="truncate">{prop.location}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-4 font-extrabold text-[#035f53] whitespace-nowrap">
                        {formatPrice(prop.price_usd)}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Views */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-bold text-neutral-700 bg-neutral-100/70 px-2.5 py-1 rounded-md text-xs">
                          <Eye size={13} className="text-neutral-400" />
                          {prop.view_count ?? 0}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* Ver cómo otros lo ven */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg text-xs font-bold text-[#035f53] border-neutral-200 hover:bg-[#035f53]/10"
                            onClick={() => onSelectProperty?.(prop.id)}
                            title="Ver cómo otros ven esta propiedad"
                          >
                            <ExternalLink size={13} />
                            <span className="hidden md:inline">Ver cómo otros lo ven</span>
                          </Button>

                          {/* Editar */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg text-xs font-bold border-neutral-200"
                            onClick={() => onEditProperty?.(prop.id)}
                            title="Editar propiedad"
                          >
                            <Pencil size={13} />
                            <span>Editar</span>
                          </Button>

                          {/* Pausar / Reactivar */}
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 rounded-lg text-xs font-bold transition-colors ${
                              isPublished
                                ? 'border-amber-200 text-amber-800 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                            }`}
                            disabled={isUpdating}
                            onClick={() => handleTogglePause(prop)}
                            title={isPublished ? 'Pausar publicación' : 'Reactivar publicación'}
                          >
                            {isUpdating ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : isPublished ? (
                              <PauseCircle size={13} />
                            ) : (
                              <PlayCircle size={13} />
                            )}
                            <span>{isPublished ? 'Pausar' : 'Reactivar'}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AccountLayout>
  )
}
