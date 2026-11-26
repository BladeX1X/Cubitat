import { lazy, Suspense } from 'react'
import { Bot, Check, Eye, EyeOff, Loader2, MapPin, RotateCcw, Trash2, X } from 'lucide-react'
import { Button } from '../../../shared/ui/button'
import { formatDate, formatPrice } from '../core/formatters'
import { STATUS_LABELS } from '../core/constants'
import type { ModerationProperty } from '../core/types'
import { PropertyDetails } from './PropertyDetails'
import { ImageDuplicateComparison } from './ImageDuplicateComparison'
import { ModerationPropertyImage } from './ModerationPropertyImage'

const TrustScoreDisclosure = import.meta.env.DEV || import.meta.env.VITE_PHASE2_UI_ENABLED === 'true'
  ? lazy(() => import('../trust-score').then((module) => ({ default: module.TrustScoreDisclosure })))
  : null

type Props = {
  property: ModerationProperty
  expanded: boolean
  actionLoading: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: () => void
  onHide: () => void
  onRestore: () => void
  onReevaluate: () => void
  onDelete: () => void
}

export function PropertyModerationCard({
  property, expanded, actionLoading, onToggle, onApprove, onReject, onHide, onRestore, onReevaluate, onDelete,
}: Props) {
  const canReview = ['pending_review', 'ai_approved', 'ai_rejected'].includes(property.status)
  return (
    <article className="bg-white rounded-2xl shadow-[0_4px_14px_rgba(10,31,28,0.04)] border border-neutral-100 overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-56 h-40 sm:h-auto bg-neutral-100 shrink-0">
          <ModerationPropertyImage src={property.cover_image} alt={property.title} className="w-full h-full object-cover" />
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
          <p className="text-lg font-extrabold text-[#035f53]">{formatPrice(property.price_usd, property.price_currency ?? 'USD')}</p>
          <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
            <span className="capitalize">{property.property_type}</span><span>·</span>
            <span className="capitalize">{property.operation}</span><span>·</span>
            <span>{formatDate(property.created_at)}</span>
          </div>
          {property.moderation_message && (
            <div className={`mt-1 text-xs p-2 rounded-lg border leading-relaxed ${property.status === 'ai_approved' ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : property.status === 'pending_review' ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-red-700 bg-red-50 border-red-100'}`}>
              <strong>{property.status === 'ai_approved' ? '🤖 Motivo de IA:' : property.status === 'ai_rejected' ? '🚨 Rechazo de IA:' : 'ℹ️ Motivo:'}</strong>{' '}
              {property.moderation_message}
            </div>
          )}
          {property.duplicate_of && (
            <div className="mt-1 text-xs p-2 rounded-lg border leading-relaxed text-orange-800 bg-orange-50 border-orange-200">
              <strong>Posible duplicado:</strong>{' '}
              coincide con «{property.duplicate_title || 'otra publicación'}».
              <span className="block text-orange-700/80 mt-0.5">Revisa ambas antes de aprobar.</span>
            </div>
          )}
          {property.image_hash_status && (
            <div className={`mt-1 text-xs p-2 rounded-lg border leading-relaxed ${property.image_duplicate_matches?.length ? 'text-violet-800 bg-violet-50 border-violet-200' : 'text-slate-700 bg-slate-50 border-slate-200'}`}>
              {property.image_duplicate_matches && property.image_duplicate_matches.length > 0 ? (
                <>
                  <strong>Posibles coincidencias de imagen:</strong>
                  <span className="block text-violet-700/80 mt-0.5">La tarjeta principal es la publicación nueva; compara cada candidata existente antes de decidir.</span>
                  <span className="block text-violet-700/80 mt-0.5">Cobertura de fotos comparables: {property.image_hash_status.indexed_with_hashes} de {property.image_hash_status.eligible_with_images} publicaciones activas con fotos propias procesables tienen hash.</span>
                  <span className="block text-violet-700/80 mt-0.5">Las imágenes externas, incluidas las de stock, no se comparan.</span>
                  <div className="mt-2 space-y-3">
                    {property.image_duplicate_matches.slice(0, 3).map((match) => (
                      <ImageDuplicateComparison key={match.id} property={property} match={match} />
                    ))}
                  </div>
                </>
              ) : property.image_hash_status.processed_images === null ? (
                <>
                  <strong>Revisión de imágenes pendiente.</strong>{' '}
                  <span>Esta publicación aún no tiene hashes; no se puede confirmar que esté libre de coincidencias.</span>
                </>
              ) : property.image_hash_status.processed_images === 0 ? (
                <>
                  <strong>No se compararon imágenes propias guardadas.</strong>{' '}
                  <span>Las imágenes externas quedan fuera del análisis; esto no significa «sin coincidencias».</span>
                </>
              ) : (
                <>
                  <strong>Sin coincidencias de imagen.</strong>{' '}
                  <span>
                    Hash procesado. Cobertura de fotos comparables: {property.image_hash_status.indexed_with_hashes} de {property.image_hash_status.eligible_with_images} publicaciones activas con fotos propias procesables.
                    {property.image_hash_status.indexed_with_hashes < property.image_hash_status.eligible_with_images
                      ? ' La revisión sigue incompleta mientras se indexan las restantes.'
                      : ' Todas las fotos propias procesables del catálogo activo tienen hash.'}
                    {' '}Las imágenes externas, incluidas las de stock, no se comparan.
                  </span>
                </>
              )}
            </div>
          )}
          <p className="text-xs text-neutral-400">Publicado por: <span className="font-medium text-neutral-600">{property.user_email || 'Usuario'}</span></p>
          {TrustScoreDisclosure && (
            <Suspense fallback={null}>
              <TrustScoreDisclosure propertyId={property.id} />
            </Suspense>
          )}
          <div className="flex flex-wrap gap-2 mt-2 pt-3 border-t border-neutral-100">
            <Button variant="outline" className="rounded-xl text-xs" onClick={onToggle}>
              <Eye className="w-3.5 h-3.5" />{expanded ? 'Cerrar detalle' : 'Ver detalle'}
            </Button>
            {canReview && (
              <>
                <Button className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onApprove} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aprobar
                </Button>
                <Button variant="outline" className="rounded-xl text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={onReject} disabled={actionLoading}>
                  <X className="w-3.5 h-3.5" /> Ocultar con motivo
                </Button>
                <Button variant="outline" className="rounded-xl text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={onReevaluate} disabled={actionLoading}>
                  <Bot className="w-3.5 h-3.5" /> Reevaluar con IA
                </Button>
              </>
            )}
            {property.status === 'published' && (
              <Button variant="outline" className="rounded-xl text-xs text-amber-700 border-amber-200 hover:bg-amber-50" onClick={onHide} disabled={actionLoading}>
                <EyeOff className="w-3.5 h-3.5" /> Ocultar con motivo
              </Button>
            )}
            {property.status === 'paused' && (
              <Button className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onRestore} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Volver a publicar
              </Button>
            )}
            <Button variant="ghost" className="rounded-xl text-xs text-red-600 hover:bg-red-50" onClick={onDelete} disabled={actionLoading}>
              <Trash2 className="w-3.5 h-3.5" /> Eliminar
            </Button>
          </div>
        </div>
      </div>
      {expanded && <PropertyDetails property={property} />}
    </article>
  )
}
