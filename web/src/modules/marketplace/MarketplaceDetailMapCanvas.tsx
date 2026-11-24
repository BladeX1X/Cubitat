import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../maps/lib/configureMapLibreWorker'
import { getOpenFreeMapStyle } from '../maps/lib/openFreeMapStyle'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'

type MarketplaceDetailMapCanvasProps = {
  center: [number, number] | null
  locationLabel: string
}

export default function MarketplaceDetailMapCanvas({ center, locationLabel }: MarketplaceDetailMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const longitude = center?.[0]
  const latitude = center?.[1]

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (longitude == null || latitude == null) {
      setLoading(false)
      setUnavailable(true)
      return
    }
    const mapLongitude = longitude
    const mapLatitude = latitude

    const controller = new AbortController()
    let loadFailed = false
    let didLoad = false
    setLoading(true)
    setUnavailable(false)

    function failMap(error: unknown) {
      if (controller.signal.aborted || loadFailed) return
      loadFailed = true
      window.clearTimeout(timeout)
      setLoading(false)
      setUnavailable(true)
      mapRef.current?.remove()
      mapRef.current = null
      logSafeEvent({ module: 'maps', action: 'init_marketplace_detail_map', level: 'error', code: sanitizeErrorReason(error) })
    }

    const timeout = window.setTimeout(() => failMap(new Error('El mapa no respondió antes del tiempo límite')), 15_000)

    async function initializeMap() {
      if (!containerRef.current || mapRef.current) return
      try {
        const style = await getOpenFreeMapStyle(controller.signal)
        if (controller.signal.aborted) return
        const map = new maplibregl.Map({
          container: containerRef.current,
          style,
          center: [mapLongitude, mapLatitude],
          zoom: 8,
          attributionControl: false,
        })
        mapRef.current = map
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
        map.once('load', () => {
          if (controller.signal.aborted || loadFailed || mapRef.current !== map) return
          didLoad = true
          window.clearTimeout(timeout)
          setLoading(false)
          setUnavailable(false)
        })
        map.on('error', (event) => {
          if (!didLoad) failMap(event.error ?? new Error('No se pudieron cargar los recursos del mapa'))
        })
      } catch (error) {
        failMap(error)
      }
    }

    void initializeMap()
    return () => {
      controller.abort()
      window.clearTimeout(timeout)
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [latitude, longitude, retryCount])

  return (
    <div className="relative h-full w-full bg-neutral-100">
      <div ref={containerRef} className="h-full w-full" aria-label={`Mapa de ${locationLabel}`} />
      {loading && !unavailable && (
        <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-100/95">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-700 border-r-transparent" aria-hidden="true" />
          <p className="text-sm text-neutral-600">Cargando mapa…</p>
        </div>
      )}
      {unavailable && (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-100/95 p-6 text-center">
          <p className="max-w-sm text-sm text-neutral-700">No se pudo cargar el mapa. El anuncio sigue disponible; puedes intentarlo de nuevo.</p>
          <button type="button" className="rounded-full border border-emerald-800 px-5 py-2 text-sm font-bold text-emerald-900" onClick={() => { setUnavailable(false); setLoading(true); setRetryCount((count) => count + 1) }}>Reintentar mapa</button>
        </div>
      )}
    </div>
  )
}
