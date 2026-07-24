import { STATUS_LABELS } from '../core/constants'
import type { ModerationProperty } from '../core/types'
import { AdvertiserContextPanel } from '../advertiser-context/AdvertiserContextPanel'

export function PropertyDetails({ property }: { property: ModerationProperty }) {
  return (
    <div className="border-t border-neutral-100 bg-neutral-50/60 p-5 grid gap-5">
      {(property.status === 'ai_approved' || property.status === 'ai_rejected') && property.moderation_message && (
        <div className={`p-4 rounded-xl border ${property.status === 'ai_approved' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
          <strong>{property.status === 'ai_approved' ? '🤖 Aprobada por IA:' : '🚨 Rechazada por IA:'}</strong>{' '}
          {property.moderation_message}
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
      <AdvertiserContextPanel userId={property.user_id} />
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
              <img key={image} src={image} alt="Imagen de propiedad" loading="lazy" className="h-28 w-full rounded-xl object-cover bg-neutral-100" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
