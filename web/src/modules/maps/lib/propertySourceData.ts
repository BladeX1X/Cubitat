import type { FeatureCollection, Point } from 'geojson'
import { formatPrice } from '../../../shared/lib/formatPrice'
import type { Property } from '../../properties/types'
import { normalizePropertyCoordinates } from './propertyCoordinates'

export function createPropertySourceData(
  properties: Property[],
  selectedPropertyId?: string,
): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: properties.flatMap((property) => {
      const coordinates = normalizePropertyCoordinates(property.coordinates)
      if (!coordinates) return []

      return [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [coordinates.longitude, coordinates.latitude],
          },
          properties: {
            id: property.id,
            title: property.title,
            label:
              property.operation === 'permuta'
                ? 'Permuta'
                : formatPrice(property.priceUsd),
            isSelected: property.id === selectedPropertyId,
          },
        },
      ]
    }),
  }
}
