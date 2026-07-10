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
  /** Called when a cluster pin is tapped — passes all property IDs inside the cluster */
  onSelectCluster?: (propertyIds: string[]) => void
  onViewportChange?: () => void
  locateTrigger?: number
}
