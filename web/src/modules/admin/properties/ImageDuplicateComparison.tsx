import { MapPin } from 'lucide-react'
import { formatDate, formatPrice } from '../core/formatters'
import { STATUS_LABELS } from '../core/constants'
import type { ModerationProperty } from '../core/types'
import { getImageMatchLabel } from './imageMatchPolicy'
import { normalizePropertyImageReference } from '../../properties/utils/images'

type Props = {
  property: ModerationProperty
  match: NonNullable<ModerationProperty['image_duplicate_matches']>[number]
}

function ComparisonListing({
  title, location, price, currency, image, imageCount, propertyType, operation, createdAt, status,
  description, bedrooms, bathrooms, areaM2, role,
}: {
  title: string
  location: string
  price: number | null
  currency?: 'USD' | 'CUP' | 'MLC' | null
  image: string | null
  imageCount: number
  propertyType: string
  operation: string
  createdAt: string
  status: ModerationProperty['status']
  description: string
  bedrooms: number
  bathrooms: number
  areaM2: number
  role: 'Nueva' | 'Existente'
}) {
  const isNew = role === 'Nueva'
  return (
    <section className={`overflow-hidden rounded-xl border ${isNew ? 'border-violet-200 bg-white' : 'border-neutral-200 bg-neutral-50'}`}>
      <div className={`flex items-center justify-between gap-2 border-b px-3 py-2 ${isNew ? 'border-violet-100 bg-violet-50' : 'border-neutral-200 bg-neutral-100'}`}>
        <strong className={`text-xs font-extrabold uppercase tracking-wide ${isNew ? 'text-violet-800' : 'text-neutral-700'}`}>
          {isNew ? 'Nueva · publicación bajo revisión' : 'Existente · posible original'}
        </strong>
        <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-neutral-600">
          {STATUS_LABELS[status]}
        </span>
      </div>
      {image ? (
        <img src={normalizePropertyImageReference(image)} alt={`Foto de ${title} (${role.toLowerCase()})`} loading="lazy" className="h-44 w-full bg-neutral-100 object-cover" />
      ) : (
        <div className="flex h-32 items-center justify-center bg-neutral-100 text-xs text-neutral-500">No hay imagen disponible</div>
      )}
      <div className="space-y-1.5 p-3">
        <h4 className="line-clamp-2 text-sm font-bold text-neutral-900">{title}</h4>
        <p className="flex items-start gap-1.5 text-xs text-neutral-600">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{location || 'Ubicación no informada'}
        </p>
        <p className="text-sm font-extrabold text-[#035f53]">{formatPrice(price, currency ?? 'USD')}</p>
        <p className="text-xs text-neutral-500">
          <span className="capitalize">{propertyType}</span> · <span className="capitalize">{operation}</span>
        </p>
        <p className="text-xs text-neutral-600">
          {areaM2 > 0 ? `${areaM2} m²` : 'Área N/D'} · {bedrooms} hab. · {bathrooms} baños
        </p>
        <p className="text-xs text-neutral-500">Publicada: {formatDate(createdAt)} · {imageCount} {imageCount === 1 ? 'imagen' : 'imágenes'}</p>
        <p className="line-clamp-3 border-t border-neutral-100 pt-2 text-xs leading-relaxed text-neutral-600">{description || 'Sin descripción'}</p>
      </div>
    </section>
  )
}

export function ImageDuplicateComparison({ property, match }: Props) {
  const plainLanguageMatch = match.distance === 0
    ? 'El sistema detectó que ambas fotos se ven prácticamente iguales.'
    : match.distance <= 4
      ? 'Encontramos imágenes muy parecidas; puede ser la misma foto con algún recorte o cambio.'
      : 'Encontramos algunas semejanzas entre las fotos; revísalas junto con los datos del inmueble.'

  return (
    <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/70 p-3 sm:p-4">
      <div className="mb-3 rounded-lg border border-violet-100 bg-white p-3">
        <h4 className="text-sm font-extrabold text-violet-950">Aviso: las fotos podrían ser iguales</h4>
        <p className="mt-1 text-xs leading-relaxed text-violet-900">{plainLanguageMatch}</p>
        <p className="mt-1 text-xs leading-relaxed text-neutral-700">
          Esto no confirma que sea la misma vivienda. Comprueba la ubicación y los detalles antes de tomar una decisión.
        </p>
        <details className="mt-2 text-[11px] text-neutral-500">
          <summary className="w-fit cursor-pointer font-semibold hover:text-neutral-700">Ver detalle técnico</summary>
          <p className="mt-1">Comparación pHash: {getImageMatchLabel(match.distance)} · {match.distance} de 64 diferencias.</p>
        </details>
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-extrabold text-violet-950">Compara las dos publicaciones</h4>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ComparisonListing
          title={property.title}
          location={property.location}
          price={property.price_usd}
          currency={property.price_currency}
          image={property.cover_image || property.images?.[0] || null}
          imageCount={new Set([property.cover_image, ...(property.images ?? [])].filter(Boolean)).size}
          propertyType={property.property_type}
          operation={property.operation}
          createdAt={property.created_at}
          status={property.status}
          description={property.description}
          bedrooms={property.bedrooms}
          bathrooms={property.bathrooms}
          areaM2={property.area_m2}
          role="Nueva"
        />
        <ComparisonListing
          title={match.title}
          location={match.location || 'Ubicación no informada'}
          price={match.price_usd ?? null}
          currency={match.price_currency}
          image={match.cover_image || match.images?.[0] || null}
          imageCount={new Set([match.cover_image, ...(match.images ?? [])].filter(Boolean)).size}
          propertyType={match.property_type || 'Tipo no informado'}
          operation={match.operation || 'Operación no informada'}
          createdAt={match.created_at || property.created_at}
          status={match.status || 'published'}
          description={match.description || ''}
          bedrooms={match.bedrooms ?? 0}
          bathrooms={match.bathrooms ?? 0}
          areaM2={match.area_m2 ?? 0}
          role="Existente"
        />
      </div>
      <div className="mt-3 rounded-lg border border-violet-100 bg-white p-3 text-xs leading-relaxed text-neutral-700">
        <strong className="text-neutral-900">Qué hacer ahora</strong>
        <ol className="mt-1.5 list-decimal space-y-1 pl-4">
          <li>Compara fotos y datos del inmueble: revisa ubicación, descripción, área y características.</li>
          <li>Si es el mismo inmueble, conserva la publicación existente y oculta la nueva con un motivo claro.</li>
          <li>Si son inmuebles distintos o no puedes confirmarlo, nunca rechaces solo por esta señal; continúa la revisión manual.</li>
        </ol>
      </div>
    </div>
  )
}
