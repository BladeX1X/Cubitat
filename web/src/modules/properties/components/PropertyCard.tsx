import type { CSSProperties } from 'react'
import {
  Bath,
  BedDouble,
  Car,
  ChevronLeft,
  ChevronRight,
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

export function PropertyCard({
  property,
  isSelected,
  onSelect,
}: PropertyCardProps) {
  const priceLabel = getPriceLabel(property)

  function selectProperty() {
    onSelect(property.id)
  }

  return (
    <article
      className={`property-card ${isSelected ? 'is-selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`Ver ${property.title}`}
      onClick={selectProperty}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          selectProperty()
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
        {property.badge ? (
          <Badge className="property-badge">{property.badge}</Badge>
        ) : null}
        <button
          className="property-photo-arrow property-photo-arrow-left"
          type="button"
          aria-label="Imagen anterior"
          onClick={(event) => event.stopPropagation()}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          className="property-photo-arrow property-photo-arrow-right"
          type="button"
          aria-label="Imagen siguiente"
          onClick={(event) => event.stopPropagation()}
        >
          <ChevronRight size={18} />
        </button>
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
          <h3 className="property-title">{property.title}</h3>
          <span className="property-price">{priceLabel}</span>
        </div>

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
        </div>
      </div>
    </article>
  )
}

function getPriceLabel(property: Property) {
  if (property.operation === 'permuta') {
    return 'Permuta'
  }

  if (property.operation === 'alquiler') {
    return `${formatPrice(property.priceUsd)} / mes`
  }

  return formatPrice(property.priceUsd)
}
