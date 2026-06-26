import { formatPrice } from '../../../shared/lib/formatPrice'
import type { Property } from '../types'
import type { CSSProperties } from 'react'

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
        style={{ '--cover-tone': property.coverTone } as CSSProperties}
      />
      <span className="property-info">
        <span className="property-title">{property.title}</span>
        <span className="property-meta">
          {property.propertyType} · {property.bedrooms} hab. ·{' '}
          {property.bathrooms} bano · {property.areaM2} m2
        </span>
        <span className="property-price">
          {property.operation === 'permuta'
            ? 'Permuta'
            : formatPrice(property.priceUsd)}
        </span>
      </span>
    </button>
  )
}
