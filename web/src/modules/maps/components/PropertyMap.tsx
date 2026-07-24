import { lazy, Suspense } from 'react'
import type { MapAdapterProps } from '../types'

const MapLibreAdapter = lazy(() =>
  import('../adapters/MapLibreAdapter').then((module) => ({
    default: module.MapLibreAdapter,
  })),
)

export function PropertyMap(props: MapAdapterProps) {
  return (
    <Suspense fallback={<MapLoadingState />}>
      <MapLibreAdapter {...props} />
    </Suspense>
  )
}


function MapLoadingState() {
  return (
    <div className="map-card map-loading-state">
      <p className="eyebrow">Modulo de mapas</p>
      <h2>Cargando mapa open source</h2>
      <p className="map-description">
        La app carga primero la busqueda y los resultados. El mapa se descarga
        como modulo independiente para mantener Cubitat mas ligero.
      </p>
    </div>
  )
}
