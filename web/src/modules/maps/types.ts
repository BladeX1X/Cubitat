import type { Property } from '../properties/types'

export type MapZone = {
  id: string
  name: string
  description: string
  labelPoint: {
    x: number
    y: number
  }
  path: string
}

export type CatalogMapListing = {
  id: string
  title: string
  location: string
  coordinates: { latitude: number; longitude: number } | null | undefined
  label: string
}

export type MapAdapterProps = {
  properties: Property[]
  listings?: CatalogMapListing[]
  listingLabel?: string
  selectedZoneId?: string
  selectedPropertyId?: string
  selectedPropertyIds?: string[]
  onSelectZone?: (zoneId: string) => void
  onSelectProperty: (propertyId: string) => void
  onSelectCluster?: (propertyIds: string[]) => void
  onViewportChange?: (propertyIds: string[]) => void
  locateTrigger?: number
}
