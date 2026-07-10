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

export type MapAdapterProps = {
  properties: Property[]
  selectedZoneId?: string
  selectedPropertyId?: string
  onSelectZone?: (zoneId: string) => void
  onSelectProperty: (propertyId: string) => void
  onSelectCluster?: (propertyIds: string[]) => void
  onViewportChange?: (propertyIds: string[]) => void
  locateTrigger?: number
}
