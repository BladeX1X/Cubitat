import type { SearchFilters } from '../../search/types'
import type { Property } from '../types'

export function filterProperties(
  properties: Property[],
  filters: SearchFilters,
) {
  return properties.filter((property) => {
    const searchableText = [
      property.title,
      property.zoneId,
      property.operation,
      property.propertyType,
    ]
      .join(' ')
      .toLowerCase()

    return (
      (filters.zoneId === 'all' || property.zoneId === filters.zoneId) &&
      (filters.operation === 'all' ||
        property.operation === filters.operation) &&
      (filters.propertyType === 'all' ||
        property.propertyType === filters.propertyType) &&
      (!filters.query ||
        searchableText.includes(filters.query.trim().toLowerCase()))
    )
  })
}
