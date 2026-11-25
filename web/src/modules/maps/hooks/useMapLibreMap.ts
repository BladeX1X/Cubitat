import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getOpenFreeMapStyle } from '../lib/openFreeMapStyle'
import { observeElementResize } from '../lib/observeElementResize'
import '../lib/configureMapLibreWorker'

export type MapLibreLoadStatus = 'loading' | 'ready' | 'error'

export type MapLibreMapOptions = {
  center: [number, number]
  zoom: number
  minZoom: number
  maxZoom: number
}

const MAP_LOAD_TIMEOUT_MS = 15_000

/** Shared OpenFreeMap/MapLibre lifecycle for property and marketplace maps. */
export function useMapLibreMap(
  containerRef: RefObject<HTMLDivElement | null>,
  options: MapLibreMapOptions,
  onError?: (error: unknown) => void,
) {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onErrorRef = useRef(onError)
  const [status, setStatus] = useState<MapLibreLoadStatus>('loading')
  const [retryCount, setRetryCount] = useState(0)
  const [centerLongitude, centerLatitude] = options.center
  const { zoom, minZoom, maxZoom } = options

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const controller = new AbortController()
    let map: maplibregl.Map | null = null
    let styleLoaded = false
    let resizeObserver: (() => void) | undefined
    const loadTimeout = window.setTimeout(() => {
      if (!styleLoaded && !controller.signal.aborted) setStatus('error')
    }, MAP_LOAD_TIMEOUT_MS)

    const handleStyleLoad = () => {
      if (controller.signal.aborted) return
      styleLoaded = true
      window.clearTimeout(loadTimeout)
      // The panel may have changed size while the style was loading.
      map?.resize()
      setStatus('ready')
    }

    const handleMapError = (error: unknown) => {
      onErrorRef.current?.(error)
      // Ignore recoverable tile/resource failures after the style is usable.
      if (!styleLoaded && !controller.signal.aborted) {
        window.clearTimeout(loadTimeout)
        setStatus('error')
      }
    }

    setStatus('loading')
    void getOpenFreeMapStyle(controller.signal).then((style) => {
      if (controller.signal.aborted || !containerRef.current) return

      map = new maplibregl.Map({
        container,
        style,
        center: [centerLongitude, centerLatitude],
        zoom,
        minZoom,
        maxZoom,
        attributionControl: false,
      })
      mapRef.current = map
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
      map.once('style.load', handleStyleLoad)
      map.on('error', handleMapError)
      resizeObserver = observeElementResize(container, () => {
        window.requestAnimationFrame(() => {
          if (!controller.signal.aborted && mapRef.current === map) map?.resize()
        })
      })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        onErrorRef.current?.(error)
        window.clearTimeout(loadTimeout)
        setStatus('error')
      }
    })

    return () => {
      controller.abort()
      window.clearTimeout(loadTimeout)
      resizeObserver?.()
      map?.off('style.load', handleStyleLoad)
      map?.off('error', handleMapError)
      map?.remove()
      if (mapRef.current === map) mapRef.current = null
    }
  }, [containerRef, centerLongitude, centerLatitude, zoom, minZoom, maxZoom, retryCount])

  const retry = useCallback(() => {
    setStatus('loading')
    setRetryCount((count) => count + 1)
  }, [])

  return { mapRef, status, retry }
}
