import type { CSSProperties } from 'react'
import { Bath, BedDouble, Car, MapPin, Ruler } from 'lucide-react'
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
  return (
    <button
      className={`property-card ${isSelected ? 'is-selected' : ''}`}
      type="button"
      onClick={() => onSelect(property.id)}
    >
      <span
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
      </span>
      <span className="property-info">
        <span className="property-kind">
          {property.propertyType} · {property.operation}
        </span>
        <span className="property-title">{property.title}</span>
        <span className="property-meta">
          <MapPin size={14} />
          {property.location}
        </span>
        <span className="property-price">
          {property.operation === 'permuta'
            ? 'Permuta'
            : formatPrice(property.priceUsd)}
        </span>
        <span className="property-specs">
          <span>
            <BedDouble size={15} />
            {property.bedrooms}
          </span>
          <span>
            <Bath size={15} />
            {property.bathrooms}
          </span>
          <span>
            <Car size={15} />
            {property.parking}
          </span>
          <span>
            <Ruler size={15} />
            {property.areaM2} m2
          </span>
        </span>
        <span className="property-actions">
          <Button asChild size="sm">
            <span>Contactar</span>
          </Button>
          <Button asChild size="sm" variant="outline">
            <span>Consultar</span>
          </Button>
        </span>
      </span>
    </button>
  )
}
