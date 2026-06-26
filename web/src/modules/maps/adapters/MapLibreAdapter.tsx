import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, {
  type LngLatBoundsLike,
  type Marker,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { formatPrice } from '../../../shared/lib/formatPrice'
import type { MapAdapterProps } from '../types'

const CUBA_BOUNDS: LngLatBoundsLike = [
  [-85.2, 19.4],
  [-73.8, 23.6],
]

const OPEN_SOURCE_STYLE =
  'https://tiles.openfreemap.org/styles/liberty'

export function MapLibreAdapter({
  properties,
  selectedPropertyId,
  onSelectProperty,
}: MapAdapterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<Marker[]>([])
  const [mapReady, setMapReady] = useState(false)

  const bounds = useMemo(() => {
    const mapBounds = new maplibregl.LngLatBounds()
    properties.forEach((property) => {
      mapBounds.extend([
        property.coordinates.longitude,
        property.coordinates.latitude,
      ])
    })
    return mapBounds
  }, [properties])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const abortController = new AbortController()

    async function initializeMap() {
      if (!containerRef.current || mapRef.current) return

      const response = await fetch(OPEN_SOURCE_STYLE, {
        signal: abortController.signal,
      })
      const style = (await response.json()) as StyleSpecification

      mapRef.current = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [-79.5, 21.8],
        zoom: 5.15,
        minZoom: 4.4,
        maxZoom: 15,
        maxBounds: CUBA_BOUNDS,
        attributionControl: false,
      })

      mapRef.current.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        'top-right',
      )
      mapRef.current.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        'bottom-right',
      )
      mapRef.current.on('load', () => {
        if (!abortController.signal.aborted) {
          setMapReady(true)
        }
      })
    }

    initializeMap().catch((error: unknown) => {
      if (!abortController.signal.aborted) {
        console.error('No se pudo inicializar el mapa open source', error)
      }
    })

    return () => {
      abortController.abort()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = properties.map((property) => {
      const markerElement = document.createElement('button')
      markerElement.type = 'button'
      markerElement.className = `maplibre-property-marker ${
        property.id === selectedPropertyId ? 'is-selected' : ''
      }`
      markerElement.textContent =
        property.operation === 'permuta'
          ? 'Permuta'
          : formatPrice(property.priceUsd)
      markerElement.addEventListener('click', () => {
        onSelectProperty(property.id)
      })

      return new maplibregl.Marker({
        element: markerElement,
        anchor: 'bottom',
      })
        .setLngLat([
          property.coordinates.longitude,
          property.coordinates.latitude,
        ])
        .addTo(map)
    })

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: { top: 74, right: 74, bottom: 74, left: 74 },
        maxZoom: 8.6,
        duration: 500,
      })
    }
  }, [bounds, mapReady, onSelectProperty, properties, selectedPropertyId])

  return (
    <div className="map-card map-card--maplibre">
      <div className="map-card-header map-card-header--floating">
        <div>
          <p className="eyebrow">Explora por zona</p>
          <h2>Mapa de propiedades</h2>
        </div>
        <span className="map-mode">En vivo</span>
      </div>

      <div
        ref={containerRef}
        className="maplibre-canvas"
        aria-label="Mapa de propiedades"
      />
    </div>
  )
}
