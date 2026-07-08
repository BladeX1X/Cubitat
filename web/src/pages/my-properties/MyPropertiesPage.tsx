import { useState, useEffect } from 'react'
import { supabase } from '../../shared/lib/supabaseClient'
import { Button } from '../../shared/ui/button'
import {
  Pencil,
  Trash2,
  Plus,
  Building2,
  MapPin,
  Calendar,
  Loader2,
} from 'lucide-react'
import { AccountLayout } from '../account/AccountLayout'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Property = {
  id: string
  title: string
  location: string
  price_usd: number
  cover_image: string | null
  status: 'published' | 'pending_review' | 'paused' | 'local_draft' | 'ai_approved' | 'ai_rejected'
  moderation_message: string | null
  created_at: string
  user_id: string
}

export type MyPropertiesPageProps = {
  onBack: () => void
  onNavigateAccount: () => void
  onNavigateFavorites: () => void
  onNavigateMyProperties: () => void
  onEditProperty: (propertyId: string) => void
  onNewProperty: (loadDraft?: boolean) => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

const STATUS_CONFIG: Record<
  Property['status'],
  { label: string; bg: string; text: string; dot: string }
> = {
  published: {
    label: 'Publicada',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  pending_review: {
    label: 'Pendiente de revisión',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  paused: {
    label: 'Oculta',
    bg: 'bg-neutral-100',
    text: 'text-neutral-500',
    dot: 'bg-neutral-400',
  },
  local_draft: {
    label: 'Borrador (Sin publicar)',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  ai_approved: {
    label: 'Aprobada por IA',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  ai_rejected: {
    label: 'Rechazada por IA',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
}

const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;base64,' +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" fill="none">
      <rect width="400" height="240" fill="#f5f5f5"/>
      <text x="200" y="125" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#a3a3a3">Sin imagen</text>
    </svg>`,
  )

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: Property['status'] }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function PropertyCard({
  property,
  onEdit,
  onDelete,
}: {
  property: Property
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="rounded-2xl shadow-md border border-neutral-100 overflow-hidden bg-white hover:shadow-lg transition-shadow group">
      {/* Cover image */}
      <div className="relative h-48 overflow-hidden bg-neutral-100">
        <img
          src={property.cover_image || PLACEHOLDER_IMAGE}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <StatusBadge status={property.status} />
        </div>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-3">
        <h3 className="text-base font-bold text-neutral-900 leading-snug line-clamp-2">
          {property.title}
        </h3>

        <div className="flex items-center gap-1.5 text-neutral-500 text-sm">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{property.location || 'Sin ubicación'}</span>
        </div>

        <p className="text-lg font-extrabold text-[#035f53]">
          {formatPrice(property.price_usd)}
        </p>

        <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(property.created_at)}
        </div>

        {property.moderation_message && (property.status === 'ai_rejected' || property.status === 'paused' || property.status === 'pending_review') && (
          <div className={`rounded-xl border p-3 text-xs leading-relaxed ${property.status === 'pending_review' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
            <strong className="block mb-1">{property.status === 'ai_rejected' ? '🚨 Rechazada por IA' : property.status === 'pending_review' ? 'ℹ️ Nota de moderación' : '🚫 Motivo del rechazo'}</strong>
            {property.moderation_message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-1 pt-3 border-t border-neutral-100">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl text-xs"
            onClick={onEdit}
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 rounded-xl text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={onDelete}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Loader2 className="w-10 h-10 text-[#035f53] animate-spin" />
      <p className="text-sm text-neutral-500 font-medium">Cargando tus propiedades…</p>
    </div>
  )
}

function EmptyState({ onPublish }: { onPublish: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center gap-5">
      {/* Illustration-like circle */}
      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
        <Building2 className="w-12 h-12 text-[#035f53]" />
      </div>

      <div className="max-w-sm">
        <h3 className="text-xl font-bold text-neutral-800 mb-2">
          Aún no tienes propiedades
        </h3>
        <p className="text-sm text-neutral-500 leading-relaxed">
          Publica tu primera propiedad y comienza a recibir consultas de
          compradores interesados en tiempo real.
        </p>
      </div>

      <Button
        className="rounded-full h-11 px-7 text-sm font-bold bg-[#035f53] hover:bg-[#024a41] text-white mt-2"
        onClick={onPublish}
      >
        <Plus className="w-4 h-4" />
        Publicar tu primera propiedad
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export function MyPropertiesPage({
  onNavigateAccount,
  onNavigateFavorites,
  onNavigateMyProperties,
  onEditProperty,
  onNewProperty,
}: MyPropertiesPageProps) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  /* ---- fetch ---- */
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        let finalProperties: Property[] = []
        if (!error && data) {
          finalProperties = data as Property[]
        }

        // Cargar borrador local si existe en localStorage
        try {
          const savedDraft = localStorage.getItem('cubitat_publish_draft')
          if (savedDraft) {
            const parsed = JSON.parse(savedDraft)
            if (parsed && typeof parsed === 'object') {
              const propertyTypeName = parsed.propertyType === 'apartamento' ? 'Departamento' : parsed.propertyType === 'casa' ? 'Casa' : 'Terreno'
              const operationName = parsed.operation === 'alquiler' ? 'en renta' : parsed.operation === 'venta' ? 'en venta' : 'en permuta'
              const draftTitle = `${propertyTypeName} ${operationName} en ${parsed.municipality || parsed.neighborhood || 'Cuba'} (Borrador)`
              
              const localDraftProp: Property = {
                id: 'local_draft_id',
                title: draftTitle,
                location: parsed.location || `${parsed.municipality || ''}, ${parsed.province || 'Cuba'}`.replace(/^,\s*/, '').replace(/,\s*$/, ''),
                price_usd: parsed.priceUsd ? Number(parsed.priceUsd) : 0,
                cover_image: null,
                status: 'local_draft',
                moderation_message: null,
                created_at: new Date().toISOString(),
                user_id: user.id,
              }
              finalProperties = [localDraftProp, ...finalProperties]
            }
          }
        } catch (e) {
          console.error('Error al parsear el borrador local:', e)
        }

        setProperties(finalProperties)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  /* ---- delete handler ---- */
  async function handleDelete(propertyId: string) {
    if (propertyId === 'local_draft_id') {
      const confirmed = window.confirm(
        '¿Estás seguro de que deseas eliminar este borrador local? Se perderán todos los datos guardados en tu navegador.',
      )
      if (!confirmed) return
      localStorage.removeItem('cubitat_publish_draft')
      setProperties((prev) => prev.filter((p) => p.id !== 'local_draft_id'))
      return
    }

    const confirmed = window.confirm(
      '¿Estás seguro de que deseas eliminar esta propiedad? Esta acción no se puede deshacer.',
    )
    if (!confirmed) return

    const { error } = await supabase.from('properties').delete().eq('id', propertyId)

    if (!error) {
      setProperties((prev) => prev.filter((p) => p.id !== propertyId))
    }
  }

  /* ---- render ---- */
  return (
    <AccountLayout
      active="contents"
      onNavigateAccount={onNavigateAccount}
      onNavigateFavorites={onNavigateFavorites}
      onNavigateMyProperties={onNavigateMyProperties}
    >
      <section className="relative overflow-hidden rounded-md bg-gradient-to-r from-[#155b55] to-[#007565] px-7 py-8 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">
          Publicaciones
        </p>
        <h1 className="text-2xl sm:text-[28px] font-black tracking-tight mt-2">
          Mis publicaciones
        </h1>
        <p className="mt-2 max-w-2xl text-sm sm:text-base font-semibold text-white/85">
          Administra, edita y controla todas las propiedades que has publicado en la plataforma.
        </p>
      </section>

      <div className="mt-8">
        <div className="bg-white rounded-xl shadow-[0_4px_14px_rgba(10,31,28,0.04)] border border-neutral-100 p-5 sm:p-6">
          {/* Top bar with count + action */}
          {!loading && properties.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8">
              <p className="text-sm text-neutral-500">
                <span className="font-bold text-neutral-800">
                  {properties.length}
                </span>{' '}
                {properties.length === 1
                  ? 'propiedad o borrador'
                  : 'propiedades o borradores'}
              </p>
              <Button
                className="rounded-full h-9 px-5 text-xs font-bold bg-[#035f53] hover:bg-[#024a41] text-white"
                onClick={() => onNewProperty()}
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva propiedad
              </Button>
            </div>
          )}

          {/* States */}
          {loading ? (
            <LoadingSpinner />
          ) : properties.length === 0 ? (
            <EmptyState onPublish={() => onNewProperty()} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onEdit={() => property.id === 'local_draft_id' ? onNewProperty(true) : onEditProperty(property.id)}
                  onDelete={() => handleDelete(property.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  )
}
