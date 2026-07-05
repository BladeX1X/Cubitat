import { useState, useEffect } from 'react'
import { supabase } from '../../shared/lib/supabaseClient'
import { Button } from '../../shared/ui/button'
import { Check, X, Loader2, Building2, MapPin, Eye, Trash2 } from 'lucide-react'

type StatusFilter = 'pending_review' | 'published' | 'paused' | 'all'

type ReportStatusFilter = 'pending' | 'resolved' | 'dismissed' | 'all'

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
  status: 'published' | 'pending_review' | 'paused'
  moderation_message: string | null
  user_email?: string
}

const STATUS_LABELS: Record<ModerationProperty['status'], string> = {
  published: 'Publicada',
  pending_review: 'Pendiente',
  paused: 'Oculta',
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

export function AdminPage({
  userRole,
  onNavigateHome,
}: {
  userRole?: string
  onNavigateHome: () => void
}) {
  const [properties, setProperties] = useState<ModerationProperty[]>([])
  const [reports, setReports] = useState<PropertyReport[]>([])
  const [activeTab, setActiveTab] = useState<'properties' | 'reports'>('properties')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending_review')
  const [reportStatusFilter, setReportStatusFilter] = useState<ReportStatusFilter>('pending')
  const [searchQuery, setSearchQuery] = useState('')

  async function loadReports() {
    setLoading(true)
    setError(null)
    try {
      const { data: repData, error: repError } = await supabase
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
        `)
        .order('created_at', { ascending: false })

      if (repError) throw repError
      setReports(repData as any || [])
    } catch (err: any) {
      console.error('Error loading reports:', err)
      setError('No se pudieron cargar los reportes.')
    } finally {
      setLoading(false)
    }
  }

  async function loadProperties() {
    setLoading(true)
    setError(null)
    try {
      const { data: props, error: propsError } = await supabase
        .from('properties')
        .select('id,title,location,description,price_usd,cover_image,images,created_at,user_id,operation,property_type,bedrooms,bathrooms,parking,area_m2,age_years,amenities,features,contact_info,status,moderation_message')
        .order('created_at', { ascending: false })

      if (propsError) throw propsError

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
  }

  useEffect(() => {
    if (activeTab === 'properties') {
      loadProperties()
    } else {
      loadReports()
    }
  }, [activeTab])

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

  const pendingCount = properties.filter((p) => p.status === 'pending_review').length
  const publishedCount = properties.filter((p) => p.status === 'published').length
  const hiddenCount = properties.filter((p) => p.status === 'paused').length
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const displayedProperties = properties.filter((property) => {
    const matchesStatus = statusFilter === 'all' || property.status === statusFilter
    const matchesQuery = !normalizedQuery || [
      property.title,
      property.location,
      property.user_email,
      property.operation,
      property.property_type,
    ].join(' ').toLowerCase().includes(normalizedQuery)
    return matchesStatus && matchesQuery
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
          <Button className="mt-4 rounded-full bg-red-700 hover:bg-red-800 text-white px-5 text-xs" onClick={loadProperties}>
            Reintentar
          </Button>
        </div>
      ) : activeTab === 'properties' && properties.length === 0 ? (
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
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_4px_14px_rgba(10,31,28,0.04)] space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                ['pending_review', `Pendientes (${pendingCount})`],
                ['published', `Publicadas (${publishedCount})`],
                ['paused', `Ocultas (${hiddenCount})`],
                ['all', `Todas (${properties.length})`],
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
                    <p className="text-xs text-neutral-400">
                      Publicado por: <span className="font-medium text-neutral-600">{property.user_email || 'Usuario'}</span>
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t border-neutral-100">
                      <Button variant="outline" className="rounded-xl text-xs" onClick={() => setSelectedId(isSelected ? null : property.id)}>
                        <Eye className="w-3.5 h-3.5" />
                        {isSelected ? 'Cerrar detalle' : 'Ver detalle'}
                      </Button>
                      {property.status === 'pending_review' && (
                        <>
                          <Button className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove(property.id)} disabled={actionLoading === property.id}>
                            {actionLoading === property.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Aprobar
                          </Button>
                          <Button variant="outline" className="rounded-xl text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReject(property.id)} disabled={actionLoading === property.id}>
                            <X className="w-3.5 h-3.5" />
                            Ocultar con motivo
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
        </div>
      )}
    </div>
  )
}
