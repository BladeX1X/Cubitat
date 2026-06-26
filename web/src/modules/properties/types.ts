export type OperationType = 'venta' | 'alquiler' | 'permuta' | 'rent-to-own'

export type PropertyType = 'casa' | 'apartamento' | 'terreno'

export type PropertyStatus = 'published' | 'pending_review' | 'paused'

export type Property = {
  id: string
  title: string
  location: string
  description: string
  zoneId: string
  operation: OperationType
  propertyType: PropertyType
  priceUsd?: number
  bedrooms: number
  bathrooms: number
  parking: number
  areaM2: number
  ageYears?: number
  amenities: string[]
  badge?: 'destacado' | 'exclusivo' | 'nuevo'
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
