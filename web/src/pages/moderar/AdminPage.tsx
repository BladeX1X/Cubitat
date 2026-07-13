import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../shared/lib/supabaseClient'
import { Button } from '../../shared/ui/button'
import { Check, X, Loader2, Building2, MapPin, Eye, Trash2, Bot } from 'lucide-react'
import { fetchAdminMetrics, type AdminMetrics } from './adminMetrics'
import { useSEO } from '../../shared/hooks/useSEO'

type StatusFilter = 'pending_review' | 'ai_approved' | 'ai_rejected' | 'published' | 'paused' | 'all'

type ReportStatusFilter = 'pending' | 'resolved' | 'dismissed' | 'all'

const PAGE_SIZE = 15

type PropertyReport = {
  id: string
  property_id: string
  reporter_id: string | null
  reason: string
  description: string | null
  status: 'pending' | 'resolved' | 'dismissed'
  created_at: string
  properties: {
    id: string
    title: string
    cover_image: string | null
    status: string
  } | null
}

type ModerationProperty = {
  id: string
  title: string
  location: string
  description: string
  price_usd: number | null
  cover_image: string | null
  images: string[] | null
  created_at: string
  user_id: string
  operation: string
  property_type: string
  bedrooms: number
  bathrooms: number
  parking: number
  area_m2: number
  age_years: number | null
  amenities: string[] | null
  features: Record<string, unknown> | null
  contact_info: { name?: string; phone?: string } | null
  status: 'published' | 'pending_review' | 'paused' | 'ai_approved' | 'ai_rejected'
  moderation_message: string | null
  user_email?: string
}

type AdminDatabaseMetrics = {
  db_bytes: number
  storage_bytes: number
  properties_count: number
  users_count: number
  reports_count: number
}

const STATUS_LABELS: Record<ModerationProperty['status'], string> = {
  published: 'Publicada',
  pending_review: 'Pendiente',
  paused: 'Oculta',
  ai_approved: 'Aprobada por IA',
  ai_rejected: 'Rechazada por IA',
}

function formatPrice(value: number | null): string {
  if (!value) return 'Precio no informado'
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function AdminPage({
  userRole,
  onNavigateHome,
}: {
  userRole?: string
  onNavigateHome: () => void
}) {
  useSEO({
    title: 'Panel de Administración',
  })

  const [properties, setProperties] = useState<ModerationProperty[]>([])
  const [reports, setReports] = useState<PropertyReport[]>([])
  const [activeTab, setActiveTab] = useState<'properties' | 'reports' | 'stats'>('properties')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [aiAlertMessage, setAiAlertMessage] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending_review')
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportStatusFilter>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [propPage, setPropPage] = useState(0)
  const [propTotal, setPropTotal] = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<StatusFilter, number>>({
    pending_review: 0,
    ai_approved: 0,
    ai_rejected: 0,
    published: 0,
    paused: 0,
    all: 0,
  })
  const [repPage, setRepPage] = useState(0)
  const [repTotal, setRepTotal] = useState(0)
  const [statsData, setStatsData] = useState<{
    db_size: string
    properties_count: number
    users_count: number
    reports_count: number
  } | null>(null)
  const [apiMetrics, setApiMetrics] = useState<AdminMetrics | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [metricsError, setMetricsError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    setError(null)
    setMetricsError(null)
    try {
      // 1. Fetch admin-only database and Storage metrics from Supabase.
      const { data: rawDatabaseMetrics, error: databaseMetricsError } = await supabase.rpc('get_admin_metrics')
      if (databaseMetricsError) throw databaseMetricsError
      const databaseMetrics = rawDatabaseMetrics as AdminDatabaseMetrics

      setStatsData({
        db_size: formatBytes(databaseMetrics.db_bytes),
        properties_count: databaseMetrics.properties_count,
        users_count: databaseMetrics.users_count,
        reports_count: databaseMetrics.reports_count,
      })

      // 2. Fetch external metrics (Cloudflare, Google Analytics)
      try {
        const externalMetrics = await fetchAdminMetrics()
        setApiMetrics({
          ...externalMetrics,
          supabase: {
            ...externalMetrics.supabase,
            db_bytes: databaseMetrics.db_bytes,
            storage_bytes: databaseMetrics.storage_bytes,
            error: externalMetrics.supabase.egress_bytes === null
              ? 'Base de datos y Storage actualizados. El egreso mensual requiere la API de uso de Supabase.'
              : externalMetrics.supabase.error,
          },
        })
      } catch (metricsFailure) {
        console.error('Error fetching api metrics', metricsFailure)
        setApiMetrics(null)
        setMetricsError(
          metricsFailure instanceof Error
            ? metricsFailure.message
            : 'No se pudieron cargar las métricas externas.',
        )
      }
    } catch (err: any) {
      console.error('Error loading stats:', err)
      setError('No se pudieron cargar las estadísticas.')
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadReports = useCallback(async (page = 0) => {
    setLoading(true)
    setError(null)
    try {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const { data: repData, error: repError, count: repCount } = await supabase
        .from('property_reports')
        .select(`
          id,
          property_id,
          reporter_id,
          reason,
          description,
          status,
          created_at,
          properties (
            id,
            title,
            cover_image,
            status
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (repError) throw repError
      setReports(repData as any || [])
      setRepTotal(repCount || 0)
      setRepPage(page)
    } catch (err: any) {
      console.error('Error loading reports:', err)
      setError('No se pudieron cargar los reportes.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadStatusCounts = useCallback(async () => {
    const statuses: Exclude<StatusFilter, 'all'>[] = ['pending_review', 'ai_approved', 'ai_rejected', 'published', 'paused']
    const [allResult, ...statusResults] = await Promise.all([
      supabase.from('properties').select('id', { count: 'exact', head: true }),
      ...statuses.map((status) => (
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true })
          .eq('status', status)
      )),
    ])

    setStatusCounts({
      all: allResult.count || 0,
      pending_review: statusResults[0]?.count || 0,
      ai_approved: statusResults[1]?.count || 0,
      ai_rejected: statusResults[2]?.count || 0,
      published: statusResults[3]?.count || 0,
      paused: statusResults[4]?.count || 0,
    })
  }, [])

  const loadProperties = useCallback(async (page = 0) => {
    setLoading(true)
    setError(null)
    try {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      let query = supabase
        .from('properties')
        .select('id,title,location,description,price_usd,cover_image,images,created_at,user_id,operation,property_type,bedrooms,bathrooms,parking,area_m2,age_years,amenities,features,contact_info,status,moderation_message', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data: props, error: propsError, count: propCount } = await query
        .range(from, to)

      if (propsError) throw propsError

      setPropTotal(propCount || 0)
      setPropPage(page)

      if (!props || props.length === 0) {
        setProperties([])
        return
      }

      const userIds = [...new Set(props.map((p: any) => p.user_id))].filter(Boolean)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      const profileMap = new Map(
        (profiles || []).map((p: any) => [
          p.id,
          p.full_name && p.email ? `${p.full_name} · ${p.email}` : p.email || p.full_name || `ID ${p.id.slice(0, 8)}`,
        ]),
      )

      setProperties(
        (props as any[]).map((p) => ({
          ...p,
          user_email: profileMap.get(p.user_id),
        })),
      )
    } catch (err: any) {
      console.error('Error loading properties:', err)
      setError(err.message || 'Error al cargar propiedades')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  function retryActiveTab() {
    if (activeTab === 'stats') {
      void loadStats()
      return
    }
    if (activeTab === 'reports') {
      void loadReports(repPage)
      return
    }
    void loadProperties(propPage)
  }

  useEffect(() => {
    if (activeTab === 'properties') {
      loadStatusCounts()
      loadProperties(0)
    } else if (activeTab === 'reports') {
      loadReports(0)
    } else if (activeTab === 'stats') {
      loadStats()
    }
  }, [activeTab, loadProperties, loadReports, loadStats, loadStatusCounts, statusFilter])

  async function updatePropertyStatus(id: string, status: ModerationProperty['status'], moderationMessage: string | null = null) {
    setActionLoading(id)
    const { error } = await supabase
      .from('properties')
      .update({ status, moderation_message: moderationMessage })
      .eq('id', id)

    if (error) {
      console.error('Error updating property:', error)
      alert('No se pudo actualizar la propiedad.')
    } else {
      setProperties((prev) => prev.map((p) => (
        p.id === id ? { ...p, status, moderation_message: moderationMessage } : p
      )))
      loadStatusCounts()
    }
    setActionLoading(null)
  }

  function handleApprove(id: string) {
    updatePropertyStatus(id, 'published', null)
  }

  function handleReject(id: string) {
    const reason = window.prompt('Escribe el motivo del rechazo. El usuario lo verá en su propiedad.')?.trim()
    if (!reason) return
    updatePropertyStatus(id, 'paused', reason)
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('¿Eliminar esta propiedad? Esta acción no se puede deshacer.')
    if (!confirmed) return

    setActionLoading(id)
    const { error } = await supabase.from('properties').delete().eq('id', id)
    if (error) {
      console.error('Error deleting property:', error)
      alert('No se pudo eliminar la propiedad.')
    } else {
      setProperties((prev) => prev.filter((p) => p.id !== id))
      if (selectedId === id) setSelectedId(null)
    }
    setActionLoading(null)
  }

  async function handleReevaluateAI(property: ModerationProperty) {
    updatePropertyStatus(property.id, 'pending_review', 'Reevaluando con IA...')
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      
      fetch('/api/ai-moderate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          property_id: property.id,
          title: property.title,
          location: property.location || '',
          description: property.description || '',
          price_usd: property.price_usd,
          property_type: property.property_type,
          images: [property.cover_image, ...(property.images || [])].filter(Boolean)
        })
      }).catch(e => console.warn('Error asincrono IA', e));
      
      setAiAlertMessage('La reevaluación por IA ha iniciado. Refresca la página en unos segundos.');
    } catch (e) {
      console.warn('Error preparando moderacion asincrona', e);
      setAiAlertMessage('Error al iniciar la reevaluación.');
    }
  }


  async function handleResolveReport(reportId: string, propertyId: string) {
    setActionLoading(reportId)
    // 1. Ocultar la propiedad
    const { error: propError } = await supabase
      .from('properties')
      .update({ status: 'paused', moderation_message: 'Ocultada por reportes de usuarios.' })
      .eq('id', propertyId)

    if (propError) {
      console.error('Error disabling property:', propError)
      alert('No se pudo desactivar la propiedad.')
      setActionLoading(null)
      return
    }

    // 2. Marcar reporte como resuelto
    const { error: repError } = await supabase
      .from('property_reports')
      .update({ status: 'resolved' })
      .eq('id', reportId)

    if (repError) {
      console.error('Error resolving report:', repError)
      alert('Propiedad desactivada, pero no se pudo actualizar el reporte.')
    } else {
      setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: 'resolved' } : r))
    }
    setActionLoading(null)
  }

  async function handleDismissReport(reportId: string) {
    setActionLoading(reportId)
    const { error: repError } = await supabase
      .from('property_reports')
      .update({ status: 'dismissed' })
      .eq('id', reportId)

    if (repError) {
      console.error('Error dismissing report:', repError)
      alert('No se pudo descartar el reporte.')
    } else {
      setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status: 'dismissed' } : r))
    }
    setActionLoading(null)
  }

  if (userRole === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen py-20 px-4">
        <Loader2 className="w-10 h-10 text-[#035f53] animate-spin" />
      </div>
    )
  }

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-20 px-4">
        <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
          <Building2 className="w-10 h-10 text-neutral-400" />
        </div>
        <h1 className="text-xl font-bold text-neutral-800">Acceso restringido</h1>
        <p className="text-sm text-neutral-500 mt-2 text-center max-w-sm">
          No tienes permisos para acceder al panel de moderación.
        </p>
        <Button className="mt-6 rounded-full bg-[#035f53] hover:bg-[#024a41] text-white px-6" onClick={onNavigateHome}>
          Ir al inicio
        </Button>
      </div>
    )
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const displayedProperties = properties.filter((property) => {
    const matchesQuery = !normalizedQuery || [
      property.title,
      property.location,
      property.user_email,
      property.operation,
      property.property_type,
    ].join(' ').toLowerCase().includes(normalizedQuery)
    return matchesQuery
  })

  const REASON_LABELS: Record<string, string> = {
    FRAUD: 'Fraude o estafa',
    INCORRECT_INFO: 'Información falsa/desactualizada',
    SPAM: 'Publicidad o spam',
    OTHER: 'Otro motivo',
  }

  const REPORT_STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    resolved: 'Resuelto (Ocultado)',
    dismissed: 'Descartado',
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-neutral-400">Administración</p>
          <h1 className="text-2xl sm:text-[28px] font-black tracking-tight mt-2 text-neutral-900">Panel de moderación</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Revisión de anuncios publicados y reportes enviados por usuarios.
          </p>
        </div>
        <div className="flex gap-2 bg-neutral-100 p-1.5 rounded-full shrink-0 h-fit w-fit">
          <button
            type="button"
            onClick={() => { setActiveTab('properties'); setLoading(true); }}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'properties'
                ? 'bg-[#035f53] text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Propiedades
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('reports'); setLoading(true); }}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'reports'
                ? 'bg-[#035f53] text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Reportes
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('stats'); }}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'stats'
                ? 'bg-[#035f53] text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Métricas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 text-[#035f53] animate-spin" />
          <p className="text-sm text-neutral-500 font-medium">Cargando propiedades…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm font-bold text-red-700">Error al cargar</p>
          <p className="text-xs text-red-500 mt-1">{error}</p>
          <Button className="mt-4 rounded-full bg-red-700 hover:bg-red-800 text-white px-5 text-xs" onClick={retryActiveTab}>
            Reintentar
          </Button>
        </div>
      ) : activeTab === 'properties' && properties.length === 0 && propTotal === 0 && statusCounts.all === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center mb-4">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-neutral-800">No hay propiedades</h2>
          <p className="text-sm text-neutral-500 mt-1">Aún no hay publicaciones para moderar.</p>
        </div>
      ) : activeTab === 'reports' && reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center mb-4">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-neutral-800">No hay reportes</h2>
          <p className="text-sm text-neutral-500 mt-1">No se han registrado reportes de usuarios.</p>
        </div>
      ) : activeTab === 'reports' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_4px_14px_rgba(10,31,28,0.04)] flex gap-2">
            {[
              ['pending', 'Pendientes'],
              ['resolved', 'Resueltos'],
              ['dismissed', 'Descartados'],
              ['all', 'Todos'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setReportStatusFilter(value as ReportStatusFilter)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                  reportStatusFilter === value
                    ? 'bg-[#035f53] text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            {reports
              .filter((r) => reportStatusFilter === 'all' || r.status === reportStatusFilter)
              .map((report) => (
                <div key={report.id} className="bg-white rounded-2xl shadow-[0_4px_14px_rgba(10,31,28,0.04)] border border-neutral-100 p-5 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-neutral-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Reporte sobre:</span>
                      <h3 className="text-sm font-bold text-neutral-800 mt-0.5">
                        {report.properties?.title || 'Propiedad no encontrada o eliminada'}
                      </h3>
                    </div>
                    <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      report.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : report.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      {REPORT_STATUS_LABELS[report.status]}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm text-neutral-600">
                    <p>
                      <strong className="text-neutral-800">Motivo:</strong>{' '}
                      <span className="text-red-700 font-semibold">{REASON_LABELS[report.reason] || report.reason}</span>
                    </p>
                    {report.description && (
                      <p className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 text-xs italic">
                        "{report.description}"
                      </p>
                    )}
                    <p className="text-xs text-neutral-400">
                      Fecha del reporte: {formatDate(report.created_at)}
                    </p>
                  </div>

                  {report.status === 'pending' && report.properties && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100">
                      <Button
                        onClick={() => handleResolveReport(report.id, report.property_id)}
                        className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
                        disabled={actionLoading === report.id}
                      >
                        {actionLoading === report.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <X size={14} />
                        )}
                        Ocultar Propiedad
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDismissReport(report.id)}
                        className="rounded-xl text-xs font-bold border-neutral-200 text-neutral-700"
                        disabled={actionLoading === report.id}
                      >
                        {actionLoading === report.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Descartar Reporte
                      </Button>
                    </div>
                  )}
                </div>
))}
          </div>

          {/* Paginación - Reportes */}
          {repTotal > PAGE_SIZE && (
            <div className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-white px-4 py-3">
              <p className="text-xs text-neutral-500">
                Página {repPage + 1} de {Math.ceil(repTotal / PAGE_SIZE)} ({repTotal} reportes)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={repPage === 0}
                  onClick={() => loadReports(repPage - 1)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={(repPage + 1) * PAGE_SIZE >= repTotal}
                  onClick={() => loadReports(repPage + 1)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'stats' ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#035f53] to-[#02443a] rounded-3xl p-6 text-white shadow-xl flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Consumo y Límites (APIs)</h2>
              <p className="text-xs text-[#a3e2d7] mt-1">
                Visualización automática de plataformas en tiempo real sin ejecutar scripts.
              </p>
            </div>
            <div className="hidden sm:flex gap-2">
              <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold border border-white/20">Supabase</span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold border border-white/20">Cloudflare</span>
              <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold border border-white/20">Google</span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={loadStats}
              disabled={statsLoading}
              className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              {statsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Actualizar métricas
            </Button>
          </div>

          {metricsError ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-bold">No se pudieron sincronizar las métricas externas.</p>
              <p className="mt-1 text-xs">{metricsError}</p>
            </div>
          ) : null}

          {statsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-[#035f53] animate-spin" />
              <p className="text-xs text-neutral-500 font-medium">Sincronizando con APIs…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cloudflare Card */}
              <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -z-0"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className="text-xs font-black text-neutral-800 uppercase tracking-wider">Cloudflare Workers</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 mb-4">Límite gratuito: 100,000 peticiones / día</p>
                  
                  {apiMetrics?.cloudflare?.error ? (
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-center">
                      <p className="text-xs text-neutral-600 font-medium">{apiMetrics.cloudflare.error}</p>
                      <p className="text-[10px] text-neutral-400 mt-1">Añade CF_API_TOKEN y CF_ACCOUNT_ID en .env</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-3xl font-black text-neutral-900">{apiMetrics?.cloudflare?.requests?.toLocaleString() || 0}</span>
                      <span className="text-xs text-neutral-500 font-medium">peticiones consumidas hoy</span>
                      <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-2">
                        <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min(((apiMetrics?.cloudflare?.requests || 0) / 100000) * 100, 100)}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Supabase Card */}
              <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-black text-neutral-800 uppercase tracking-wider">Supabase</span>
                  </div>
                  <div className="flex flex-col gap-0.5 mb-4">
                    <p className="text-[10px] text-neutral-500">Límite Base de Datos: <b>500 MB</b> {apiMetrics?.supabase?.db_bytes !== undefined && apiMetrics?.supabase?.db_bytes !== null ? <span className="text-emerald-600 font-bold ml-1">({(apiMetrics.supabase.db_bytes / 1024 / 1024).toFixed(1)} MB usados)</span> : ''}</p>
                    <p className="text-[10px] text-neutral-500">Límite Storage (Imágenes): <b>1 GB</b> {apiMetrics?.supabase?.storage_bytes !== undefined && apiMetrics?.supabase?.storage_bytes !== null ? <span className="text-emerald-600 font-bold ml-1">({(apiMetrics.supabase.storage_bytes / 1024 / 1024).toFixed(1)} MB usados)</span> : ''}</p>
                    <p className="text-[10px] text-neutral-500">Límite Ancho de banda: <b>5 GB / mes</b> {apiMetrics?.supabase?.egress_bytes !== undefined && apiMetrics?.supabase?.egress_bytes !== null ? <span className="text-emerald-600 font-bold ml-1">({(apiMetrics.supabase.egress_bytes / 1024 / 1024 / 1024).toFixed(2)} GB usados)</span> : ''}</p>
                  </div>
                  
                  {apiMetrics?.supabase?.error && (
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 mb-4 text-center">
                      <p className="text-[10px] text-neutral-600 font-medium">{apiMetrics.supabase.error}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xl font-black text-neutral-900">{statsData?.properties_count}</p>
                      <p className="text-[10px] text-neutral-500">Anuncios</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-neutral-900">{statsData?.users_count}</p>
                      <p className="text-[10px] text-neutral-500">Usuarios</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-neutral-100">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-xs font-bold text-neutral-600">Espacio en BD consumido</span>
                      <span className="text-[10px] font-medium text-neutral-400">{statsData?.db_size} / 500 MB</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Analytics Card */}
              <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-0"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-xs font-black text-neutral-800 uppercase tracking-wider">Google Analytics</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 mb-4">Tráfico y visitantes en tiempo real</p>
                  
                  {apiMetrics?.analytics?.error ? (
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-center">
                      <p className="text-xs text-neutral-600 font-medium">{apiMetrics.analytics.error}</p>
                      <p className="text-[10px] text-neutral-400 mt-1">Requiere credenciales Service Account</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-3xl font-black text-neutral-900">{apiMetrics?.analytics?.activeUsers || 0}</span>
                      <span className="text-xs text-neutral-500 font-medium">usuarios activos ahora</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_4px_14px_rgba(10,31,28,0.04)] space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                ['pending_review', `Pendientes (${statusCounts.pending_review})`],
                ['ai_approved', `IA: Aprobadas (${statusCounts.ai_approved})`],
                ['ai_rejected', `IA: Rechazadas (${statusCounts.ai_rejected})`],
                ['published', `Publicadas (${statusCounts.published})`],
                ['paused', `Ocultas (${statusCounts.paused})`],
                ['all', `Todas (${statusCounts.all})`],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value as StatusFilter)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${statusFilter === value ? 'bg-[#035f53] text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar por título, ubicación, anunciante, operación o tipo..."
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-[#035f53] focus:ring-2 focus:ring-[#035f53]/10"
            />
            <p className="text-xs text-neutral-500">
              Mostrando <span className="font-bold text-neutral-800">{displayedProperties.length}</span> resultado(s)
            </p>
          </div>

          {displayedProperties.length === 0 && (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
              No hay propiedades que coincidan con estos filtros.
            </div>
          )}

          {displayedProperties.map((property) => {
            const isSelected = selectedId === property.id
            return (
              <div key={property.id} className="bg-white rounded-2xl shadow-[0_4px_14px_rgba(10,31,28,0.04)] border border-neutral-100 overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-56 h-40 sm:h-auto bg-neutral-100 shrink-0">
                    {property.cover_image ? (
                      <img src={property.cover_image} alt={property.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">Sin imagen</div>
                    )}
                  </div>
                  <div className="flex-1 p-5 flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2 items-start justify-between">
                      <h3 className="text-base font-bold text-neutral-900 leading-snug line-clamp-2">{property.title}</h3>
                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-600">
                        {STATUS_LABELS[property.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-500 text-sm">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{property.location}</span>
                    </div>
                    <p className="text-lg font-extrabold text-[#035f53]">{formatPrice(property.price_usd)}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
                      <span className="capitalize">{property.property_type}</span>
                      <span>·</span>
                      <span className="capitalize">{property.operation}</span>
                      <span>·</span>
                      <span>{formatDate(property.created_at)}</span>
                    </div>
                    {property.moderation_message && (
                      <div className={`mt-1 text-xs p-2 rounded-lg border leading-relaxed ${property.status === 'ai_approved' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : property.status === 'pending_review' ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-red-700 bg-red-50 border-red-100'}`}>
                        <strong>{property.status === 'ai_approved' ? '🤖 Motivo de IA:' : property.status === 'ai_rejected' ? '🚨 Rechazo de IA:' : 'ℹ️ Motivo:'}</strong> {property.moderation_message}
                      </div>
                    )}
                    <p className="text-xs text-neutral-400">
                      Publicado por: <span className="font-medium text-neutral-600">{property.user_email || 'Usuario'}</span>
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t border-neutral-100">
                      <Button variant="outline" className="rounded-xl text-xs" onClick={() => setSelectedId(isSelected ? null : property.id)}>
                        <Eye className="w-3.5 h-3.5" />
                        {isSelected ? 'Cerrar detalle' : 'Ver detalle'}
                      </Button>
                      {(property.status === 'pending_review' || property.status === 'ai_approved' || property.status === 'ai_rejected') && (
                        <>
                          <Button className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove(property.id)} disabled={actionLoading === property.id}>
                            {actionLoading === property.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Aprobar
                          </Button>
                          <Button variant="outline" className="rounded-xl text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReject(property.id)} disabled={actionLoading === property.id}>
                            <X className="w-3.5 h-3.5" />
                            Ocultar con motivo
                          </Button>
                          <Button variant="outline" className="rounded-xl text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => handleReevaluateAI(property)} disabled={actionLoading === property.id}>
                            <Bot className="w-3.5 h-3.5" />
                            Reevaluar con IA
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" className="rounded-xl text-xs text-red-600 hover:bg-red-50" onClick={() => handleDelete(property.id)} disabled={actionLoading === property.id}>
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="border-t border-neutral-100 bg-neutral-50/60 p-5 grid gap-5">
                    {(property.status === 'ai_approved' || property.status === 'ai_rejected') && property.moderation_message && (
                      <div className={`p-4 rounded-xl border ${property.status === 'ai_approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                        <strong>{property.status === 'ai_approved' ? '🤖 Aprobada por IA:' : '🚨 Rechazada por IA:'}</strong> {property.moderation_message}
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-neutral-800 mb-2">Descripción</h4>
                      <p className="text-sm text-neutral-600 whitespace-pre-wrap">{property.description || 'Sin descripción'}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div><strong>Dormitorios:</strong> {property.bedrooms}</div>
                      <div><strong>Baños:</strong> {property.bathrooms}</div>
                      <div><strong>Parqueos:</strong> {property.parking}</div>
                      <div><strong>Área:</strong> {property.area_m2} m²</div>
                      <div><strong>Antigüedad:</strong> {property.age_years ?? 'N/D'}</div>
                      <div><strong>Estado:</strong> {STATUS_LABELS[property.status]}</div>
                    </div>
                    {property.contact_info && (
                      <div className="rounded-xl bg-white border border-neutral-100 p-4 text-sm">
                        <h4 className="font-bold text-neutral-800 mb-2">Contacto</h4>
                        <p>Nombre: {property.contact_info.name || 'N/D'}</p>
                        <p>Teléfono: {property.contact_info.phone || 'N/D'}</p>
                      </div>
                    )}
                    {property.amenities && property.amenities.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-neutral-800 mb-2">Amenidades</h4>
                        <div className="flex flex-wrap gap-2">
                          {property.amenities.map((amenity) => (
                            <span key={amenity} className="rounded-full bg-white border border-neutral-100 px-3 py-1 text-xs text-neutral-600">{amenity}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {property.images && property.images.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-neutral-800 mb-2">Imágenes</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {property.images.map((image) => (
                            <img key={image} src={image} alt="Imagen de propiedad" className="h-28 w-full rounded-xl object-cover bg-neutral-100" />
                          ))}
                        </div>
                      </div>
                    )}
                    {property.moderation_message && (
                      <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                        <strong className="block mb-1">Último motivo de rechazo</strong>
                        {property.moderation_message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Paginación - Propiedades */}
          {propTotal > PAGE_SIZE && (
            <div className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-white px-4 py-3">
              <p className="text-xs text-neutral-500">
                Página {propPage + 1} de {Math.ceil(propTotal / PAGE_SIZE)} ({propTotal} propiedades)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={propPage === 0}
                  onClick={() => loadProperties(propPage - 1)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={(propPage + 1) * PAGE_SIZE >= propTotal}
                  onClick={() => loadProperties(propPage + 1)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {aiAlertMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setAiAlertMessage(null)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-75 fade-in duration-300 ease-out text-center">
            <h3 className="text-lg font-bold text-neutral-900 mb-2">Aviso del Sistema</h3>
            <p className="text-sm text-neutral-600 mb-6">{aiAlertMessage}</p>
            <Button 
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              onClick={() => setAiAlertMessage(null)}
            >
              Aceptar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
