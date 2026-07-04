import { useState, useEffect } from 'react'
import { supabase } from '../../shared/lib/supabaseClient'
import { Button } from '../../shared/ui/button'
import { Check, X, Loader2, Building2, MapPin } from 'lucide-react'

type PendingProperty = {
  id: string
  title: string
  location: string
  price_usd: number
  cover_image: string | null
  created_at: string
  user_id: string
  operation: string
  property_type: string
  user_email?: string
}

function formatPrice(value: number): string {
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
  const [properties, setProperties] = useState<PendingProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function loadPendingProperties() {
    setLoading(true)
    setError(null)
    try {
      const { data: props, error: propsError } = await supabase
        .from('properties')
        .select('id,title,location,price_usd,cover_image,created_at,user_id,operation,property_type')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false })

      if (propsError) throw propsError

      if (!props || props.length === 0) {
        setProperties([])
        return
      }

      const userIds = [...new Set(props.map((p: any) => p.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      const profileMap = new Map(
        (profiles || []).map((p: any) => [p.id, p.email || p.full_name || 'Sin email']),
      )

      setProperties(
        (props as any[]).map((p) => ({
          ...p,
          user_email: profileMap.get(p.user_id),
        })),
      )
    } catch (err: any) {
      console.error('Error loading pending properties:', err)
      setError(err.message || 'Error al cargar propiedades pendientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userRole !== 'admin') {
      setLoading(false)
      return
    }
    loadPendingProperties()
  }, [userRole])

  async function handleApprove(id: string) {
    setActionLoading(id)
    const { error } = await supabase
      .from('properties')
      .update({ status: 'published' })
      .eq('id', id)

    if (error) {
      console.error('Error approving property:', error)
    } else {
      setProperties((prev) => prev.filter((p) => p.id !== id))
    }
    setActionLoading(null)
  }

  async function handleReject(id: string) {
    setActionLoading(id)
    const { error } = await supabase
      .from('properties')
      .update({ status: 'paused' })
      .eq('id', id)

    if (error) {
      console.error('Error rejecting property:', error)
    } else {
      setProperties((prev) => prev.filter((p) => p.id !== id))
    }
    setActionLoading(null)
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
        <Button
          className="mt-6 rounded-full bg-[#035f53] hover:bg-[#024a41] text-white px-6"
          onClick={onNavigateHome}
        >
          Ir al inicio
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-neutral-400">
          Administración
        </p>
        <h1 className="text-2xl sm:text-[28px] font-black tracking-tight mt-2 text-neutral-900">
          Panel de moderación
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Revisa y aprueba las propiedades pendientes de publicación.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 text-[#035f53] animate-spin" />
          <p className="text-sm text-neutral-500 font-medium">Cargando propiedades pendientes…</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm font-bold text-red-700">Error al cargar</p>
          <p className="text-xs text-red-500 mt-1">{error}</p>
          <Button
            className="mt-4 rounded-full bg-red-700 hover:bg-red-800 text-white px-5 text-xs"
            onClick={loadPendingProperties}
          >
            Reintentar
          </Button>
        </div>
      ) : properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center mb-4">
            <Check className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-neutral-800">Todo al día</h2>
          <p className="text-sm text-neutral-500 mt-1">
            No hay propiedades pendientes de revisión.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-neutral-500 mb-4">
            <span className="font-bold text-neutral-800">{properties.length}</span>{' '}
            {properties.length === 1 ? 'propiedad pendiente' : 'propiedades pendientes'}
          </p>
          {properties.map((property) => (
            <div
              key={property.id}
              className="bg-white rounded-2xl shadow-[0_4px_14px_rgba(10,31,28,0.04)] border border-neutral-100 overflow-hidden flex flex-col sm:flex-row"
            >
              <div className="sm:w-56 h-40 sm:h-auto bg-neutral-100 shrink-0">
                {property.cover_image ? (
                  <img
                    src={property.cover_image}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                    Sin imagen
                  </div>
                )}
              </div>
              <div className="flex-1 p-5 flex flex-col gap-2">
                <h3 className="text-base font-bold text-neutral-900 leading-snug line-clamp-2">
                  {property.title}
                </h3>
                <div className="flex items-center gap-1.5 text-neutral-500 text-sm">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{property.location}</span>
                </div>
                <p className="text-lg font-extrabold text-[#035f53]">
                  {formatPrice(property.price_usd)}
                </p>
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
                <div className="flex gap-2 mt-2 pt-3 border-t border-neutral-100">
                  <Button
                    className="flex-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleApprove(property.id)}
                    disabled={actionLoading === property.id}
                  >
                    {actionLoading === property.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Aprobar
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl text-xs text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleReject(property.id)}
                    disabled={actionLoading === property.id}
                  >
                    <X className="w-3.5 h-3.5" />
                    Rechazar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
