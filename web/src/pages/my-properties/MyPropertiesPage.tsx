import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { supabase } from '../../shared/lib/supabaseClient'
import { Button } from '../../shared/ui/button'
import {
  Pencil,
  Trash2,
  Plus,
  MapPin,
  Calendar,
  Loader2,
  Eye,
} from 'lucide-react'
import { AccountLayout } from '../account/AccountLayout'
import { useSEO } from '../../shared/hooks/useSEO'
import { readPublicationDraft } from '../publish/draftStorage'
import { readCompleteDraft, removeCompleteDraft } from '../publish/completeDraftStorage'
import { getPropertyStatusConfig, type PropertyStatus } from '../../modules/properties/propertyStatus'
import { PropertyVisibilityActions } from './PropertyVisibilityActions'
import { hideOwnProperty, restoreOwnProperty } from './visibilityRepository'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'
import { createOwnedPropertyCoverPreviews, revokePrivateImagePreviewUrls } from '../../modules/properties/utils/privateImagePreviews'
import { getLocalDraftCoverImage } from './localDraftCover'

const PropertyVerificationPanel = import.meta.env.DEV
  || import.meta.env.VITE_PHASE2_UI_ENABLED === 'true'
  || import.meta.env.VITE_PROPERTY_VERIFICATION_UI_ENABLED === 'true'
  ? lazy(() => import('../../modules/property-verification/PropertyVerificationPanel').then((module) => ({
      default: module.PropertyVerificationPanel,
    })))
  : null

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Property = {
  id: string
  title: string
  location: string
  price_usd: number | null
  price_currency?: 'USD' | 'CUP' | 'MLC' | null
  cover_image: string | null
  cover_preview_url?: string | null
  status: PropertyStatus
  moderation_message: string | null
  created_at: string
  user_id: string
  view_count?: number
}

type PropertyStatusFilter = 'all' | 'review' | 'published' | 'rejected' | 'draft' | 'hidden'

const PROPERTY_STATUS_FILTERS: Array<{
  id: PropertyStatusFilter
  label: string
  className: string
}> = [
  { id: 'all', label: 'Todas', className: 'border-neutral-200 text-neutral-700' },
  { id: 'review', label: 'En revisión', className: 'border-amber-200 text-amber-800' },
  { id: 'published', label: 'Publicadas', className: 'border-emerald-200 text-emerald-800' },
  { id: 'rejected', label: 'Rechazadas', className: 'border-red-200 text-red-800' },
  { id: 'draft', label: 'Borradores', className: 'border-blue-200 text-blue-800' },
  { id: 'hidden', label: 'Ocultas', className: 'border-neutral-200 text-neutral-700' },
]

function matchesStatusFilter(property: Property, filter: PropertyStatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'review') return property.status === 'pending_review'
  if (filter === 'published') return property.status === 'published' || property.status === 'ai_approved'
  if (filter === 'rejected') return property.status === 'ai_rejected'
  if (filter === 'draft') return property.status === 'draft' || property.status === 'local_draft'
  return property.status === 'paused' || property.status === 'owner_hidden'
}

export type MyPropertiesPageProps = {
  userId: string
  onBack: () => void
  onNavigateAccount: () => void
  onNavigateFavorites: () => void
  onNavigateMyProperties: () => void
  onNavigateAgentDashboard?: () => void
  onEditProperty: (propertyId: string) => void
  onNewProperty: (loadDraft?: boolean) => void
  onSelectProperty?: (propertyId: string) => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatPrice(value: number | null | undefined, currency: 'USD' | 'CUP' | 'MLC' = 'USD'): string {
  if (value == null || Number.isNaN(value)) return 'Valor no indicado'
  if (currency !== 'USD') {
    return `${currency} ${value.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
  }

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
  const cfg = getPropertyStatusConfig(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

export function PropertyCard({
  property,
  onEdit,
  onDelete,
  onHide,
  onRestore,
  onView,
  actionLoading,
}: {
  property: Property
  onEdit: () => void
  onDelete: () => void
  onHide: () => void
  onRestore: () => void
  onView?: () => void
  actionLoading: boolean
}) {
  return (
    <div className="rounded-2xl shadow-md border border-neutral-100 overflow-hidden bg-white hover:shadow-lg transition-shadow group">
      {/* Cover image */}
      <div className="relative h-48 overflow-hidden bg-neutral-100">
        <img
          src={property.cover_preview_url || property.cover_image || PLACEHOLDER_IMAGE}
          alt={property.title}
          onError={(event) => {
            event.currentTarget.onerror = null
            event.currentTarget.src = PLACEHOLDER_IMAGE
          }}
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
          {formatPrice(property.price_usd ?? undefined, property.price_currency ?? 'USD')}
        </p>

        <div className="flex items-center justify-between text-neutral-400 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(property.created_at)}
          </div>
          {property.status !== 'local_draft' && (
            <div className="flex items-center gap-1.5 font-bold text-neutral-600 bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-100">
              <Eye className="w-3.5 h-3.5 text-neutral-400" />
              <span>{property.view_count ?? 0}</span>
            </div>
          )}
        </div>

        {property.moderation_message && (property.status === 'ai_rejected' || property.status === 'paused' || property.status === 'pending_review') && (
          <div className={`rounded-xl border p-3 text-xs leading-relaxed ${property.status === 'pending_review' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
            <strong className="block mb-1">{property.status === 'ai_rejected' ? '🚨 Rechazada por IA' : property.status === 'pending_review' ? 'ℹ️ Nota de moderación' : '🚫 Motivo del rechazo'}</strong>
            {property.moderation_message}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-1 pt-3 border-t border-neutral-100">
          {property.status !== 'local_draft' && onView && (
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs bg-[#035f53]/5 hover:bg-[#035f53]/10 text-[#035f53] border-none font-bold py-2"
              onClick={onView}
              disabled={actionLoading}
            >
              <Eye className="w-3.5 h-3.5" />
              Ver cómo otros lo ven
            </Button>
          )}
          <div className="flex flex-wrap gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-xl text-xs"
              onClick={onEdit}
              disabled={actionLoading}
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </Button>
            <PropertyVisibilityActions
              status={property.status}
              loading={actionLoading}
              onHide={onHide}
              onRestore={onRestore}
            />
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 rounded-xl text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={onDelete}
              disabled={actionLoading}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </Button>
          </div>
        </div>
        {PropertyVerificationPanel && property.status !== 'local_draft' && (
          <Suspense fallback={null}>
            <PropertyVerificationPanel propertyId={property.id} userId={property.user_id} />
          </Suspense>
        )}
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

export function MyPropertiesEmptyState({ onPublish }: { onPublish: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center gap-5">
      <svg aria-hidden="true" focusable="false" className="w-28 h-28 mb-2" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M25 80V30H65" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />
        <line x1="65" y1="30" x2="65" y2="40" stroke="#94a3b8" strokeWidth="2" />
        <rect x="35" y="45" width="30" height="35" rx="3" fill="#f0fdf4" stroke="#035f53" strokeWidth="2.5" />
        <rect x="41" y="51" width="6" height="6" rx="1" fill="#cbd5e1" />
        <rect x="53" y="51" width="6" height="6" rx="1" fill="#cbd5e1" />
        <rect x="41" y="63" width="6" height="6" rx="1" fill="#cbd5e1" />
        <rect x="53" y="63" width="6" height="6" rx="1" fill="#cbd5e1" />
        <g className="animate-bounce" style={{ animationDuration: '3.5s' }}>
          <circle cx="70" cy="40" r="12" fill="#008f79" />
          <path d="M70 35V45M65 40H75" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </svg>

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
  userId,
  onNavigateAccount,
  onNavigateFavorites,
  onNavigateMyProperties,
  onNavigateAgentDashboard,
  onEditProperty,
  onNewProperty,
  onSelectProperty,
}: MyPropertiesPageProps) {
  useSEO({
    title: 'Mis Publicaciones',
  })

  const [properties, setProperties] = useState<Property[]>([])
  const [statusFilter, setStatusFilter] = useState<PropertyStatusFilter>('all')
  const privatePreviewRows = useRef<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [visibilityLoadingId, setVisibilityLoadingId] = useState<string | null>(null)
  const [visibilityMessage, setVisibilityMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const visibleProperties = properties.filter((property) => matchesStatusFilter(property, statusFilter))

  /* ---- fetch ---- */
  useEffect(() => {
    let active = true
    revokePrivateImagePreviewUrls(privatePreviewRows.current)
    privatePreviewRows.current = []
    async function load() {
      setLoading(true)
      setProperties([])
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!active) return
        if (!user || user.id !== userId) return

        const { data, error } = await supabase
          .from('properties')
          .select('id,title,location,price_usd,price_currency,cover_image,status,moderation_message,created_at,user_id,view_count')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        let finalProperties: Property[] = []
        if (!error && data) {
          finalProperties = await createOwnedPropertyCoverPreviews(data as Property[], user.id)
          if (!active) {
            revokePrivateImagePreviewUrls(finalProperties)
            return
          }
          privatePreviewRows.current = finalProperties
        }

        // Cargar borrador local si existe en localStorage
        try {
          const parsed = readPublicationDraft(userId)
          if (parsed) {
              let localDraftCover: string | null = null
              try {
                const completeDraft = await readCompleteDraft(userId)
                localDraftCover = getLocalDraftCoverImage(completeDraft?.images)
              } catch (error) {
                logSafeEvent({
                  module: 'my_properties',
                  action: 'load_local_draft_cover',
                  level: 'warn',
                  code: sanitizeErrorReason(error),
                })
              }
              const municipality = typeof parsed.municipality === 'string' ? parsed.municipality : ''
              const neighborhood = typeof parsed.neighborhood === 'string' ? parsed.neighborhood : ''
              const province = typeof parsed.province === 'string' ? parsed.province : 'Cuba'
              const location = typeof parsed.location === 'string'
                ? parsed.location
                : `${municipality}, ${province}`.replace(/^,\s*/, '').replace(/,\s*$/, '')
              const propertyTypeName = parsed.propertyType === 'apartamento' ? 'Departamento' : parsed.propertyType === 'casa' ? 'Casa' : 'Terreno'
              const operationName = parsed.operation === 'alquiler' ? 'en renta' : parsed.operation === 'venta' ? 'en venta' : 'en permuta'
              const draftTitle = `${propertyTypeName} ${operationName} en ${municipality || neighborhood || 'Cuba'} (Borrador)`
              
              const localDraftProp: Property = {
                id: 'local_draft_id',
                title: draftTitle,
                location,
                price_usd: parsed.priceUsd ? Number(parsed.priceUsd) : 0,
                price_currency: parsed.priceCurrency === 'CUP' || parsed.priceCurrency === 'MLC'
                  ? parsed.priceCurrency
                  : 'USD',
                cover_image: localDraftCover,
                status: 'local_draft',
                moderation_message: null,
                created_at: new Date().toISOString(),
                user_id: user.id,
              }
              finalProperties = [localDraftProp, ...finalProperties]
          }
        } catch (e) {
          logSafeEvent({
            module: 'my_properties',
            action: 'parse_local_draft',
            level: 'error',
            code: sanitizeErrorReason(e),
          })
        }

        if (active) setProperties(finalProperties)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
      revokePrivateImagePreviewUrls(privatePreviewRows.current)
      privatePreviewRows.current = []
    }
  }, [userId])

  /* ---- delete handler ---- */
  async function handleDelete(propertyId: string) {
    if (propertyId === 'local_draft_id') {
      const confirmed = window.confirm(
        '¿Estás seguro de que deseas eliminar este borrador local? Se perderán todos los datos guardados en tu navegador.',
      )
      if (!confirmed) return
      try {
        await removeCompleteDraft(userId)
      } catch (error) {
        logSafeEvent({ module: 'publish', action: 'delete_local_draft', level: 'warn', code: sanitizeErrorReason(error) })
        alert('No se pudo eliminar el borrador. Inténtalo de nuevo.')
        return
      }
      setProperties((prev) => prev.filter((p) => p.id !== 'local_draft_id'))
      return
    }

    const confirmed = window.confirm(
      '¿Estás seguro de que deseas eliminar esta propiedad? Esta acción no se puede deshacer.',
    )
    if (!confirmed) return

    setVisibilityLoadingId(propertyId)
    setVisibilityMessage(null)
    try {
      const { error } = await supabase.from('properties').delete().eq('id', propertyId)
      if (error) throw error
      setProperties((prev) => prev.filter((p) => p.id !== propertyId))
      setVisibilityMessage({ type: 'success', text: 'La propiedad fue eliminada.' })
    } catch (reason) {
      logSafeEvent({
        module: 'my_properties',
        action: 'delete_property',
        level: 'error',
        code: sanitizeErrorReason(reason),
      })
      setVisibilityMessage({
        type: 'error',
        text: 'No se pudo eliminar la propiedad. Comprueba tu conexión y vuelve a intentarlo.',
      })
    } finally {
      setVisibilityLoadingId(null)
    }
  }

  async function handleVisibility(property: Property, nextStatus: 'owner_hidden' | 'published') {
    const hiding = nextStatus === 'owner_hidden'
    const confirmed = window.confirm(hiding
      ? '¿Ocultar esta publicación? Dejará de aparecer públicamente y solo tú podrás volver a publicarla.'
      : '¿Volver a publicar esta propiedad? Volverá a aparecer en los resultados públicos.')
    if (!confirmed) return

    setVisibilityLoadingId(property.id)
    setVisibilityMessage(null)
    try {
      if (hiding) await hideOwnProperty(property.id, userId)
      else await restoreOwnProperty(property.id, userId)

      setProperties((current) => current.map((item) => (
        item.id === property.id
          ? { ...item, status: nextStatus, moderation_message: null }
          : item
      )))
      setVisibilityMessage({
        type: 'success',
        text: hiding ? 'La publicación quedó oculta.' : 'La propiedad volvió a publicarse.',
      })
    } catch (reason) {
      logSafeEvent({
        module: 'my_properties',
        action: 'update_owner_visibility',
        level: 'error',
        code: sanitizeErrorReason(reason),
      })
      setVisibilityMessage({
        type: 'error',
        text: 'No se pudo cambiar la visibilidad. Actualiza la página e inténtalo de nuevo.',
      })
    } finally {
      setVisibilityLoadingId(null)
    }
  }

  /* ---- render ---- */
  return (
    <AccountLayout
      active="contents"
      onNavigateAccount={onNavigateAccount}
      onNavigateFavorites={onNavigateFavorites}
      onNavigateMyProperties={onNavigateMyProperties}
      onNavigateAgentDashboard={onNavigateAgentDashboard}
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

          {!loading && properties.length > 0 && (
            <div className="mb-6">
              <div
                role="group"
                aria-label="Filtrar publicaciones por estado"
                className="flex gap-2 overflow-x-auto pb-2"
              >
                {PROPERTY_STATUS_FILTERS.map((filter) => {
                  const count = properties.filter((property) => matchesStatusFilter(property, filter.id)).length
                  const active = statusFilter === filter.id
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      aria-pressed={active}
                      disabled={count === 0 && filter.id !== 'all'}
                      onClick={() => setStatusFilter(filter.id)}
                      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${filter.className} ${active ? 'bg-[#035f53] !border-[#035f53] !text-white' : 'bg-white hover:bg-neutral-50'}`}
                    >
                      {filter.label}
                      <span className={`rounded-full px-1.5 py-0.5 text-xs ${active ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
              {statusFilter !== 'all' && (
                <p className="mt-1 text-xs text-neutral-500" aria-live="polite">
                  Mostrando {visibleProperties.length} de {properties.length} publicaciones
                </p>
              )}
            </div>
          )}

          {visibilityMessage && (
            <div
              role={visibilityMessage.type === 'error' ? 'alert' : 'status'}
              className={`mb-5 rounded-xl border p-3 text-sm font-medium ${visibilityMessage.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
            >
              {visibilityMessage.text}
            </div>
          )}

          {/* States */}
          {loading ? (
            <LoadingSpinner />
          ) : properties.length === 0 ? (
            <MyPropertiesEmptyState onPublish={() => onNewProperty()} />
          ) : visibleProperties.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 px-6 py-12 text-center">
              <p className="font-semibold text-neutral-800">No hay publicaciones en este estado</p>
              <button
                type="button"
                className="mt-3 text-sm font-semibold text-[#035f53] underline underline-offset-2"
                onClick={() => setStatusFilter('all')}
              >
                Ver todas las publicaciones
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  onEdit={() => property.id === 'local_draft_id' ? onNewProperty(true) : onEditProperty(property.id)}
                  onDelete={() => handleDelete(property.id)}
                  onHide={() => void handleVisibility(property, 'owner_hidden')}
                  onRestore={() => void handleVisibility(property, 'published')}
                  onView={onSelectProperty ? () => onSelectProperty(property.id) : undefined}
                  actionLoading={visibilityLoadingId === property.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AccountLayout>
  )
}
