export type ValuationInput = {
  propertyType: 'casa' | 'apartamento' | 'terreno'
  operation: 'venta' | 'alquiler'
  location: string
  areaM2: number
}

export type PropertyComparable = {
  id: string
  areaM2: number
  priceUsd: number
  publishedAt: string
}

export type ValuationEstimate = {
  medianUsd: number
  medianPricePerM2: number
  comparables: PropertyComparable[]
  estimatedAt: string
}
