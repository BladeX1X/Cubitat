import type { OperationType, PropertyType } from '../properties/types'

export type SearchFilters = {
  query: string
  operations: OperationType[] // Multiple operations can be selected at the same time
  propertyType: PropertyType | 'all'
  zoneId: string | 'all'
  bedrooms?: number | 'all'
  bathrooms?: number | 'all'
  parking?: number | 'all'
  priceRange?: string | 'all' // e.g. "0-50000", "50000-100000" etc.
}

export type LocationSuggestion = {
  label: string
  zoneId: string
}
