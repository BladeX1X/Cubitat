import type { FeatureCollection, Point } from 'geojson'
import { formatPrice } from '../../../shared/lib/formatPrice'
import type { Property } from '../../properties/types'
import { approximatePropertyCoordinates } from './propertyCoordinates'

export function createPropertySourceData(
  properties: Property[],
  selectedPropertyId?: string,
  selectedPropertyIds: readonly string[] = [],
): FeatureCollection<Point> {
  const selectedIds = new Set(selectedPropertyIds)
  return {
    type: 'FeatureCollection',
    features: properties.flatMap((property) => {
      const coordinates = approximatePropertyCoordinates(property.coordinates, property.location)
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
                : formatPrice(property.priceUsd, property.priceCurrency),
            isSelected: property.id === selectedPropertyId || selectedIds.has(property.id),
          },
        },
      ]
    }),
  }
}
