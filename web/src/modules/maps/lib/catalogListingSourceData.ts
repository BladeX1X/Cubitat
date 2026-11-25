import type { FeatureCollection, Point } from 'geojson'
import type { CatalogMapListing } from '../types'
import { approximatePropertyCoordinates } from './propertyCoordinates'

export function createCatalogListingSourceData(
  listings: CatalogMapListing[],
  selectedListingId?: string,
  selectedListingIds: readonly string[] = [],
): FeatureCollection<Point> {
  const selectedIds = new Set(selectedListingIds)
  return {
    type: 'FeatureCollection',
    features: listings.flatMap((listing) => {
      const coordinates = approximatePropertyCoordinates(listing.coordinates, listing.location)
      if (!coordinates) return []
      return [{
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [coordinates.longitude, coordinates.latitude] },
        properties: {
          id: listing.id,
          title: listing.title,
          label: listing.label,
          isSelected: listing.id === selectedListingId || selectedIds.has(listing.id),
        },
      }]
    }),
  }
}
