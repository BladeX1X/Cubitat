import { lazy, Suspense } from 'react'
import type { Property } from '../properties/types'
import type { ProvinceCount } from '../marketplace/provinceAggregates'
import { ProvinceMapStatus } from '../marketplace/ProvinceMapStatus'
import type { MapAdapterProps } from '../maps/types'

const PropertyMap = lazy(() => import('../maps/components/PropertyMap').then((module) => ({ default: module.PropertyMap })))
const ProvinceAggregateMap = lazy(() => import('../marketplace/ProvinceAggregateMap').then((module) => ({ default: module.ProvinceAggregateMap })))

type PropertyCatalogMapProps = {
  mode: 'properties'
  properties: Property[]
  selectedPropertyId?: string
  onSelectProperty: MapAdapterProps['onSelectProperty']
  onSelectCluster?: MapAdapterProps['onSelectCluster']
  onViewportChange?: MapAdapterProps['onViewportChange']
}

type ProvinceCatalogMapProps = {
  mode: 'province-counts'
  counts: ProvinceCount[]
  selectedProvince: string
  onSelectProvince: (province: string) => void
  onClose: () => void
  accent?: string
  resultLabel?: string
}

export type CatalogMapProps = PropertyCatalogMapProps | ProvinceCatalogMapProps

/** Single map entry point for every catalog; data/interaction mode is explicit. */
export function CatalogMap(props: CatalogMapProps) {
  return (
    <Suspense fallback={props.mode === 'province-counts'
      ? <ProvinceMapStatus onClose={props.onClose} resultLabel={props.resultLabel ?? 'resultados'} />
      : <div className="map-card map-loading-state" role="status">Cargando mapa…</div>}>
      {props.mode === 'properties' ? (
        <PropertyMap
          properties={props.properties}
          selectedPropertyId={props.selectedPropertyId}
          onSelectProperty={props.onSelectProperty}
          onSelectCluster={props.onSelectCluster}
          onViewportChange={props.onViewportChange}
        />
      ) : (
        <ProvinceAggregateMap
          counts={props.counts}
          selectedProvince={props.selectedProvince}
          onSelectProvince={props.onSelectProvince}
          onClose={props.onClose}
          accent={props.accent}
          resultLabel={props.resultLabel}
        />
      )}
    </Suspense>
  )
}
