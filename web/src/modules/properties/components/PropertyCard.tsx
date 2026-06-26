import type { CSSProperties } from 'react'
import {
  ArrowRight,
  Bath,
  BedDouble,
  Car,
  Heart,
  MapPin,
  MessageCircle,
  Ruler,
} from 'lucide-react'
import { formatPrice } from '../../../shared/lib/formatPrice'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import type { Property } from '../types'

type PropertyCardProps = {
  property: Property
  isSelected: boolean
  onSelect: (propertyId: string) => void
}

const operationLabels: Record<Property['operation'], string> = {
  venta: 'Venta',
  alquiler: 'Alquiler',
  permuta: 'Permuta',
  'rent-to-own': 'Rent-to-own',
}

const propertyTypeLabels: Record<Property['propertyType'], string> = {
  casa: 'Casa',
  apartamento: 'Apartamento',
  terreno: 'Terreno',
}

export function PropertyCard({
  property,
  isSelected,
  onSelect,
}: PropertyCardProps) {
  const operationLabel = operationLabels[property.operation]
  const propertyTypeLabel = propertyTypeLabels[property.propertyType]
  const amenityPreview = property.amenities.slice(0, 2)
  const priceLabel =
    property.operation === 'permuta'
      ? 'Permuta'
      : property.operation === 'alquiler'
        ? `${formatPrice(property.priceUsd)} / mes`
        : formatPrice(property.priceUsd)

  return (
    <article
      className={`property-card ${isSelected ? 'is-selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`Ver ${property.title}`}
      onClick={() => onSelect(property.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(property.id)
        }
      }}
    >
      <div
        className="property-photo"
        style={
          {
            '--cover-tone': property.coverTone,
            '--cover-image': `url("${property.coverImage}")`,
          } as CSSProperties
        }
      >
        <div className="property-photo-top">
          {property.badge ? (
            <Badge className="property-badge">{property.badge}</Badge>
          ) : null}
          <span className="property-operation">{operationLabel}</span>
        </div>
        <button
          className="property-save"
          type="button"
          aria-label={`Guardar ${property.title}`}
          onClick={(event) => event.stopPropagation()}
        >
          <Heart size={17} />
        </button>
      </div>

      <div className="property-info">
        <div className="property-heading-row">
          <span className="property-price">{priceLabel}</span>
          <span className="property-type">{propertyTypeLabel}</span>
        </div>

        <h3 className="property-title">{property.title}</h3>

        <span className="property-meta">
          <MapPin size={14} />
          {property.location}
        </span>

        <div className="property-specs" aria-label="Caracteristicas">
          <span>
            <BedDouble size={15} />
            {property.bedrooms} hab
          </span>
          <span>
            <Bath size={15} />
            {property.bathrooms} bano
          </span>
          <span>
            <Car size={15} />
            {property.parking} auto
          </span>
          <span>
            <Ruler size={15} />
            {property.areaM2} m2
          </span>
        </div>

        <div className="property-amenities" aria-label="Amenidades">
          {amenityPreview.map((amenity) => (
            <span key={amenity}>{amenity}</span>
          ))}
        </div>

        <div className="property-actions">
          <Button
            className="property-contact-action"
            type="button"
            size="sm"
            onClick={(event) => event.stopPropagation()}
          >
            <MessageCircle size={15} />
            Contactar
          </Button>
          <Button
            className="property-detail-action"
            type="button"
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation()
              onSelect(property.id)
            }}
          >
            Ver detalle
            <ArrowRight size={15} />
          </Button>
        </div>
      </div>
    </article>
  )
}
