import type { SearchFilters } from '../../search/types'
import type { Property } from '../types'

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function filterProperties(
  properties: Property[],
  filters: SearchFilters,
) {
  const normalizedQuery = filters.query ? normalizeSearchText(filters.query.trim()) : ''

  return properties.filter((property) => {
    if (property.status !== 'published') return false

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
    if (!zoneMatches) return false

    const operationMatches =
      filters.operations.length === 0 ||
      filters.operations.includes(property.operation)
    if (!operationMatches) return false

    const propertyTypeMatches =
      filters.propertyType === 'all' ||
      property.propertyType === filters.propertyType
    if (!propertyTypeMatches) return false

    if (normalizedQuery) {
      const searchableText = [
        property.title,
        property.location,
        property.zoneId,
        property.operation,
        property.propertyType,
      ].join(' ')
      const normalizedSearchableText = normalizeSearchText(searchableText)
      if (!normalizedSearchableText.includes(normalizedQuery)) return false
    }

    return true
  })
}
