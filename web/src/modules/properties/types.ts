export type OperationType = 'venta' | 'alquiler' | 'permuta' | 'rent-to-own'

export type PropertyType = 'casa' | 'apartamento' | 'terreno'

export type PropertyStatus = 'published' | 'pending_review' | 'paused'

export type Property = {
  id: string
  title: string
  zoneId: string
  operation: OperationType
  propertyType: PropertyType
  priceUsd?: number
  bedrooms: number
  bathrooms: number
  areaM2: number
  status: PropertyStatus
  coverTone: string
  mapPoint: {
    x: number
    y: number
  }
  coordinates: {
    latitude: number
    longitude: number
  }
}
