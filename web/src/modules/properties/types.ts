export type OperationType = 'venta' | 'alquiler' | 'permuta'

export type PropertyType = 'casa' | 'apartamento' | 'terreno'

export type PropertyStatus = 'published' | 'pending_review' | 'paused' | 'ai_approved' | 'ai_rejected'

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
  coverImage: string
  images?: string[]
  mapPoint: {
    x: number
    y: number
  }
  coordinates: {
    latitude: number
    longitude: number
  }
  contact_info?: {
    name?: string
    phone?: string
    email?: string
  } | null
}
