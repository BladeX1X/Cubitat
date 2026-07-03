import type { SearchFilters } from '../../search/types'
import type { Property } from '../types'

export function filterProperties(
  properties: Property[],
  filters: SearchFilters,
) {
  return properties.filter((property) => {
    const searchableText = [
      property.title,
      property.location,
      property.zoneId,
      property.operation,
      property.propertyType,
    ]
      .join(' ')
      .toLowerCase()

    // Filter bedrooms (>=)
    if (filters.bedrooms && filters.bedrooms !== 'all') {
      const targetBedrooms = Number(filters.bedrooms)
      if (property.bedrooms < targetBedrooms) return false
    }

    // Filter bathrooms (>=)
    if (filters.bathrooms && filters.bathrooms !== 'all') {
      const targetBathrooms = Number(filters.bathrooms)
      if (property.bathrooms < targetBathrooms) return false
    }

    // Filter parking (>=)
    if (filters.parking && filters.parking !== 'all') {
      const targetParking = Number(filters.parking)
      if (property.parking < targetParking) return false
    }

    // Filter price range
    if (filters.priceRange && filters.priceRange !== 'all') {
      const [minStr, maxStr] = filters.priceRange.split('-')
      const minPrice = minStr ? Number(minStr) : 0
      const maxPrice = maxStr ? Number(maxStr) : Infinity
      const price = property.priceUsd || 0
      if (price < minPrice || price > maxPrice) return false
    }

    // Evaluate zone matching: either structured zoneId matches OR the location text matches the search query
    const zoneMatches = filters.zoneId === 'all' || property.zoneId === filters.zoneId

    const operationMatches =
      filters.operations.length === 0 ||
      filters.operations.includes(property.operation)

    return (
      zoneMatches &&
      operationMatches &&
      (filters.propertyType === 'all' ||
        property.propertyType === filters.propertyType) &&
      (!filters.query ||
        searchableText.includes(filters.query.trim().toLowerCase()))
    )
  })
}
