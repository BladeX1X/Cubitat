import type { OperationType, PropertyType } from '../properties/types'

export type SearchFilters = {
  query: string
  operation: OperationType | 'all'
  propertyType: PropertyType | 'all'
  zoneId: string | 'all'
}
