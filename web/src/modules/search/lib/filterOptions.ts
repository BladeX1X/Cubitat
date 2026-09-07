import type { SearchFilters } from '../types'

export const purchasePriceOptions = [
  { label: 'Hasta $50k', value: '0-50000' },
  { label: '$50k - $100k', value: '50000-100000' },
  { label: '$100k - $200k', value: '100000-200000' },
  { label: 'Más de $200k', value: '200000-' },
]

export const rentPriceOptions = [
  { label: 'Hasta $200', value: '0-200' },
  { label: '$200 - $500', value: '200-500' },
  { label: '$500 - $1000', value: '500-1000' },
  { label: 'Más de $1000', value: '1000-' },
]

export const segmentOptions = ['all', 1, 2, 3, 4] as const
export const parkingOptions = ['all', 1, 2, 3] as const
export const propertyTypeOptions = ['casa', 'apartamento', 'terreno'] as const

export function getOperationLabel(filters: SearchFilters) {
  if (filters.operations.length === 0) return 'Operación'

  return filters.operations
    .map((op) => op === 'alquiler' ? 'Renta' : op === 'venta' ? 'Venta' : 'Permuta')
    .join(' + ')
}

export function getPropertyTypeLabel(filters: SearchFilters) {
  if (filters.propertyType === 'casa') return 'Casas'
  if (filters.propertyType === 'apartamento') return 'Departamentos'
  if (filters.propertyType === 'terreno') return 'Terrenos'
  return 'Inmueble'
}

export function getPriceLabel(filters: SearchFilters) {
  const isRent = filters.operations.includes('alquiler')

  if (!filters.priceRange || filters.priceRange === 'all') return 'Precio'

  const option = (isRent ? rentPriceOptions : purchasePriceOptions)
    .find((item) => item.value === filters.priceRange)

  if (option) return option.label

  const [minStr, maxStr] = filters.priceRange.split('-')
  const minVal = minStr ? Number(minStr) : 0
  const maxVal = maxStr ? Number(maxStr) : null

  if (minVal > 0 && maxVal) return `$${minVal} - $${maxVal}`
  if (minVal > 0) return `Más de $${minVal}`
  if (maxVal) return `Hasta $${maxVal}`

  return 'Precio'
}

export function getActiveExtraFiltersCount(filters: SearchFilters) {
  const isPermuta = filters.operations.includes('permuta')
  let count = 0

  if (filters.bedrooms && filters.bedrooms !== 'all') count++
  if (filters.bathrooms && filters.bathrooms !== 'all') count++
  if (filters.parking && filters.parking !== 'all') count++
  if (filters.priceRange && filters.priceRange !== 'all' && !isPermuta) count++
  if (filters.verifiedOnly) count++

  return count
}
