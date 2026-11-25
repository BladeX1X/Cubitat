import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import type { MapAdapterProps } from '../types'
import { approximatePropertyCoordinates } from '../lib/propertyCoordinates'
import { createPropertySourceData } from '../lib/propertySourceData'
import { shouldFitInitialBounds } from '../lib/mapCamera'
import { classifyMapError, classifyMapErrorResource } from '../lib/mapErrorDiagnostics'
import { observeElementResize } from '../lib/observeElementResize'
import { logSafeEvent } from '../../../shared/lib/logger'
import { useMapLibreMap } from '../hooks/useMapLibreMap'
import { MapLibreStatusOverlay } from '../components/MapLibreStatusOverlay'

const PROPERTY_SOURCE_ID = 'cubitat-properties'
const CLUSTER_SELECTED_HALO_LAYER_ID = 'property-cluster-selected-halo'
const CLUSTER_LAYER_ID = 'property-clusters'
const CLUSTER_COUNT_LAYER_ID = 'property-cluster-count'
const PROPERTY_SELECTED_HALO_LAYER_ID = 'property-selected-halo'
const PROPERTY_POINT_LAYER_ID = 'property-points'
const PROPERTY_LABEL_LAYER_ID = 'property-labels'
const MAP_OPTIONS = { center: [-79.5, 21.8] as [number, number], zoom: 5.15, minZoom: 2, maxZoom: 15 }

export function MapLibreAdapter({
  properties,
  selectedPropertyId,
  selectedPropertyIds,
  onSelectProperty,
  onSelectCluster,
  onViewportChange,
  locateTrigger,
}: MapAdapterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const onSelectPropertyRef = useRef(onSelectProperty)
  const onSelectClusterRef = useRef(onSelectCluster)
  const onViewportChangeRef = useRef(onViewportChange)
  const sourceDataRef = useRef<FeatureCollection<Point>>(createPropertySourceData([], undefined))
  const fallbackMarkersRef = useRef<maplibregl.Marker[]>([])
  const hasFittedInitialBoundsRef = useRef(false)
  const reportedMapErrorsRef = useRef(new Set<string>())

  const handleMapError = useCallback((error: unknown) => {
    const errorEvent = error && typeof error === 'object'
      ? error as maplibregl.ErrorEvent & { sourceId?: unknown }
      : null
    const resource = classifyMapErrorResource(errorEvent?.sourceId)
    const code = classifyMapError(errorEvent?.error ?? error)
    const signature = `${resource}:${code}`
    if (reportedMapErrorsRef.current.has(signature)) return
    reportedMapErrorsRef.current.add(signature)
    logSafeEvent({
      module: 'maps',
      action: errorEvent?.error ? 'maplibre_resource' : 'init_maplibre',
      level: 'error',
      code,
      context: errorEvent?.error ? { resource } : undefined,
    })
  }, [])

  const { mapRef, status: mapStatus, retry: retryMap } = useMapLibreMap(
    containerRef,
    MAP_OPTIONS,
    handleMapError,
  )
  const mapReady = mapStatus === 'ready'

  useEffect(() => {
    onSelectPropertyRef.current = onSelectProperty
  }, [onSelectProperty])

  useEffect(() => {
    onSelectClusterRef.current = onSelectCluster
  }, [onSelectCluster])

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange
  }, [onViewportChange])

  const sourceData = useMemo(
    () => createPropertySourceData(properties, selectedPropertyId, selectedPropertyIds),
    [properties, selectedPropertyId, selectedPropertyIds],
  )

  useEffect(() => {
    sourceDataRef.current = sourceData
  }, [sourceData])

  const bounds = useMemo(() => {
    const mapBounds = new maplibregl.LngLatBounds()
    properties.forEach((property) => {
      const coordinates = approximatePropertyCoordinates(property.coordinates, property.location)
      if (coordinates) {
        mapBounds.extend([coordinates.longitude, coordinates.latitude])
      }
    })
    return mapBounds
  }, [properties])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    if (map.getSource(PROPERTY_SOURCE_ID)) return

    map.addSource(PROPERTY_SOURCE_ID, {
      type: 'geojson',
      data: sourceDataRef.current,
      cluster: true,
      clusterMaxZoom: 14,   // cluster until very detailed zoom (street level)
      clusterRadius: 65,
      clusterProperties: {
        selected_count: ['+', ['case', ['boolean', ['get', 'isSelected'], false], 1, 0]],
      },
    })

    map.addLayer({
      id: CLUSTER_SELECTED_HALO_LAYER_ID,
      type: 'circle',
      source: PROPERTY_SOURCE_ID,
      filter: ['all', ['has', 'point_count'], ['>', ['coalesce', ['get', 'selected_count'], 0], 0]],
      paint: {
        'circle-color': 'rgba(3, 95, 83, 0.18)',
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          38,
          4,
          45,
          8,
          52,
        ],
        'circle-stroke-color': '#035f53',
        'circle-stroke-width': 4,
      },
    })

    map.addLayer({
      id: CLUSTER_LAYER_ID,
      type: 'circle',
      source: PROPERTY_SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'case',
          ['>', ['coalesce', ['get', 'selected_count'], 0], 0],
          '#035f53',
          '#ffffff',
        ],
        'circle-radius': [
          'case',
          ['>', ['coalesce', ['get', 'selected_count'], 0], 0],
          [
            'step',
            ['get', 'point_count'],
            28,
            4,
            34,
            8,
            40,
          ],
          [
            'step',
            ['get', 'point_count'],
            22,
            4,
            28,
            8,
            34,
          ],
        ],
        'circle-stroke-color': [
          'case',
          ['>', ['coalesce', ['get', 'selected_count'], 0], 0],
          '#f8fafc',
          '#9ca3af',
        ],
        'circle-stroke-width': [
          'case',
          ['>', ['coalesce', ['get', 'selected_count'], 0], 0],
          5,
          2.5,
        ],
      },
    })

    map.addLayer({
      id: CLUSTER_COUNT_LAYER_ID,
      type: 'symbol',
      source: PROPERTY_SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 14,
        'text-font': ['Noto Sans Bold'],
      },
      paint: {
        'text-color': [
          'case',
          ['>', ['coalesce', ['get', 'selected_count'], 0], 0],
          '#ffffff',
          '#374151',
        ],
      },
    })

    map.addLayer({
      id: PROPERTY_SELECTED_HALO_LAYER_ID,
      type: 'circle',
      source: PROPERTY_SOURCE_ID,
      filter: ['all', ['!', ['has', 'point_count']], ['boolean', ['get', 'isSelected'], false]],
      paint: {
        'circle-color': 'rgba(3, 95, 83, 0.2)',
        'circle-radius': 24,
        'circle-stroke-color': '#035f53',
        'circle-stroke-width': 4,
      },
    })

    map.addLayer({
      id: PROPERTY_POINT_LAYER_ID,
      type: 'circle',
      source: PROPERTY_SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'case',
          ['boolean', ['get', 'isSelected'], false],
          '#035f53',
          '#ffffff',
        ],
        'circle-radius': [
          'case',
          ['boolean', ['get', 'isSelected'], false],
          14,
          12,
        ],
        'circle-stroke-color': [
          'case',
          ['boolean', ['get', 'isSelected'], false],
          '#024a41',
          '#035f53',
        ],
        'circle-stroke-width': 2.5,
      },
    })

    map.addLayer({
      id: PROPERTY_LABEL_LAYER_ID,
      type: 'symbol',
      source: PROPERTY_SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 11,
        'text-font': ['Noto Sans Bold'],
        'text-offset': [0, -1.85],
        'text-anchor': 'bottom',
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': [
          'case',
          ['boolean', ['get', 'isSelected'], false],
          '#024a41',
          '#035f53',
        ],
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
      },
    })

    const handleClusterClick = async (event: maplibregl.MapMouseEvent) => {
      const feature = map.queryRenderedFeatures(event.point, {
        layers: [CLUSTER_SELECTED_HALO_LAYER_ID, CLUSTER_LAYER_ID, CLUSTER_COUNT_LAYER_ID],
      })[0]
      const clusterId = feature?.properties?.cluster_id as number | undefined
      if (clusterId === undefined) return

      const source = map.getSource(PROPERTY_SOURCE_ID) as maplibregl.GeoJSONSource

      // If caller wants to handle cluster selection, resolve property IDs and pass them up
      if (onSelectClusterRef.current) {
        const pointCount = (feature?.properties?.point_count as number) ?? 0
        try {
          const leaves = await source.getClusterLeaves(clusterId, pointCount, 0)
          const ids = leaves
            .map((leaf: GeoJSON.Feature) => leaf.properties?.id as string | undefined)
            .filter((id: string | undefined): id is string => !!id)
          if (ids.length > 0) {
            onSelectClusterRef.current(ids)
            return
          }
        } catch {
          // Fall through to zoom
        }
      }

      // Default: zoom into cluster
      const zoom = await source.getClusterExpansionZoom(clusterId)
      map.easeTo({
        center: (feature.geometry as Point).coordinates as [number, number],
        zoom,
      })
    }

    const handleMapClick = (event: maplibregl.MapMouseEvent) => {
      const clusterFeature = map.queryRenderedFeatures(event.point, {
        layers: [CLUSTER_SELECTED_HALO_LAYER_ID, CLUSTER_LAYER_ID, CLUSTER_COUNT_LAYER_ID],
      })[0]
      if (clusterFeature) {
        void handleClusterClick(event)
        return
      }

      const propertyFeature = map.queryRenderedFeatures(event.point, {
        layers: [PROPERTY_POINT_LAYER_ID, PROPERTY_LABEL_LAYER_ID],
      })[0]
      const propertyId = propertyFeature?.properties?.id as string | undefined
      if (propertyId) {
        onSelectPropertyRef.current(propertyId)
        return
      }
    }

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer'
    }

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = ''
    }

    const getVisiblePropertyIds = () => {
      const currentBounds = map.getBounds()
      return sourceDataRef.current.features
        .filter((feature) => {
          const [longitude, latitude] = feature.geometry.coordinates as [number, number]
          return currentBounds.contains([longitude, latitude])
        })
        .map((feature) => feature.properties?.id as string | undefined)
        .filter((id): id is string => !!id)
    }

    const handleViewportChange = () => {
      onViewportChangeRef.current?.(getVisiblePropertyIds())
    }

    map.on('click', handleMapClick)
    map.on('mouseenter', CLUSTER_SELECTED_HALO_LAYER_ID, handleMouseEnter)
    map.on('mouseenter', CLUSTER_LAYER_ID, handleMouseEnter)
    map.on('mouseenter', CLUSTER_COUNT_LAYER_ID, handleMouseEnter)
    map.on('mouseenter', PROPERTY_SELECTED_HALO_LAYER_ID, handleMouseEnter)
    map.on('mouseenter', PROPERTY_POINT_LAYER_ID, handleMouseEnter)
    map.on('mouseenter', PROPERTY_LABEL_LAYER_ID, handleMouseEnter)
    map.on('mouseleave', CLUSTER_LAYER_ID, handleMouseLeave)
    map.on('mouseleave', CLUSTER_SELECTED_HALO_LAYER_ID, handleMouseLeave)
    map.on('mouseleave', CLUSTER_COUNT_LAYER_ID, handleMouseLeave)
    map.on('mouseleave', PROPERTY_SELECTED_HALO_LAYER_ID, handleMouseLeave)
    map.on('mouseleave', PROPERTY_POINT_LAYER_ID, handleMouseLeave)
    map.on('mouseleave', PROPERTY_LABEL_LAYER_ID, handleMouseLeave)
    map.on('dragend', handleViewportChange)
    map.on('zoomend', handleViewportChange)
    map.on('rotateend', handleViewportChange)
    map.on('pitchend', handleViewportChange)

    const container = containerRef.current
    const stopObservingResize = container
      ? observeElementResize(container, () => {
          requestAnimationFrame(() => {
            if (mapRef.current !== map) return
            handleViewportChange()
          })
        })
      : () => undefined

    return () => {
      map.off('click', handleMapClick)
      map.off('mouseenter', CLUSTER_SELECTED_HALO_LAYER_ID, handleMouseEnter)
      map.off('mouseenter', CLUSTER_LAYER_ID, handleMouseEnter)
      map.off('mouseenter', CLUSTER_COUNT_LAYER_ID, handleMouseEnter)
      map.off('mouseenter', PROPERTY_SELECTED_HALO_LAYER_ID, handleMouseEnter)
      map.off('mouseenter', PROPERTY_POINT_LAYER_ID, handleMouseEnter)
      map.off('mouseenter', PROPERTY_LABEL_LAYER_ID, handleMouseEnter)
      map.off('mouseleave', CLUSTER_LAYER_ID, handleMouseLeave)
      map.off('mouseleave', CLUSTER_SELECTED_HALO_LAYER_ID, handleMouseLeave)
      map.off('mouseleave', CLUSTER_COUNT_LAYER_ID, handleMouseLeave)
      map.off('mouseleave', PROPERTY_SELECTED_HALO_LAYER_ID, handleMouseLeave)
      map.off('mouseleave', PROPERTY_POINT_LAYER_ID, handleMouseLeave)
      map.off('mouseleave', PROPERTY_LABEL_LAYER_ID, handleMouseLeave)
      map.off('dragend', handleViewportChange)
      map.off('zoomend', handleViewportChange)
      map.off('rotateend', handleViewportChange)
      map.off('pitchend', handleViewportChange)
      stopObservingResize()
    }
  }, [mapReady, mapRef])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const existingSource = map.getSource(PROPERTY_SOURCE_ID)
    if (existingSource) {
      ;(existingSource as maplibregl.GeoJSONSource).setData(sourceData)
    }
  }, [mapReady, mapRef, sourceData])

  // MapLibre 6 can finish the style without painting the GeoJSON layers when
  // an external style/source update races the first idle event. Keep a DOM
  // marker fallback isolated to that case so the map remains usable while the
  // canvas layers continue to provide clustering whenever they render.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    let cancelled = false
    let retryTimer: number | undefined
    let stopRetryTimer: number | undefined
    let lastFallbackSignature: string | null = null
    const clearFallbackMarkers = () => {
      fallbackMarkersRef.current.forEach((marker) => marker.remove())
      fallbackMarkersRef.current = []
    }

    const renderFallbackMarkers = () => {
      if (cancelled) return

      let renderedFeatureCount = 0
      try {
        renderedFeatureCount = map.queryRenderedFeatures({
          layers: [
            CLUSTER_SELECTED_HALO_LAYER_ID,
            CLUSTER_LAYER_ID,
            CLUSTER_COUNT_LAYER_ID,
            PROPERTY_SELECTED_HALO_LAYER_ID,
            PROPERTY_POINT_LAYER_ID,
            PROPERTY_LABEL_LAYER_ID,
          ],
        }).length
      } catch {
        renderedFeatureCount = 0
      }

      if (renderedFeatureCount > 0) {
        clearFallbackMarkers()
        lastFallbackSignature = null
        if (retryTimer !== undefined) window.clearInterval(retryTimer)
        return
      }

      // Rebuild from the latest filtered source each time. Keeping the old
      // markers here made sale pins persist after switching to rentals and
      // prevented fallback markers from ever grouping.
      const groups = new Map<string, typeof sourceDataRef.current.features>()
      const cellSize = 65
      for (const feature of sourceDataRef.current.features) {
        const pixel = map.project(feature.geometry.coordinates as [number, number])
        const key = `${Math.floor(pixel.x / cellSize)}:${Math.floor(pixel.y / cellSize)}`
        groups.set(key, [...(groups.get(key) ?? []), feature])
      }

      const signature = [...groups.entries()]
        .map(([cell, features]) => `${cell}:${features.map((feature) => feature.properties?.id).join(',')}`)
        .sort()
        .join('|')
      if (signature === lastFallbackSignature) return
      lastFallbackSignature = signature
      clearFallbackMarkers()

      fallbackMarkersRef.current = [...groups.values()].flatMap((features) => {
        const selectedCount = features.filter((feature) => feature.properties?.isSelected).length
        const entries = features.flatMap((feature) => {
          const id = feature.properties?.id as string | undefined
          return id ? [{
            id,
            title: String(feature.properties?.title ?? 'propiedad'),
            label: String(feature.properties?.label ?? 'Ver'),
            coordinates: feature.geometry.coordinates as [number, number],
          }] : []
        })
        if (entries.length === 0) return []

        const element = document.createElement('button')
        element.type = 'button'
        const isCluster = entries.length > 1
        element.className = isCluster
          ? `maplibre-property-marker maplibre-cluster-marker${selectedCount > 0 ? ' is-selected' : ''}`
          : `maplibre-property-marker${selectedCount > 0 ? ' is-selected' : ''}`
        element.textContent = isCluster ? String(entries.length) : entries[0].label
        element.setAttribute(
          'aria-label',
          isCluster
            ? selectedCount === entries.length
              ? `${entries.length} propiedades seleccionadas`
              : selectedCount > 0
                ? `${selectedCount} de ${entries.length} propiedades seleccionadas`
                : `${entries.length} propiedades agrupadas. Ver resultados del grupo`
            : `Ver ${entries[0].title}`,
        )
        element.addEventListener('click', () => {
          if (entries.length > 1 && onSelectClusterRef.current) {
            onSelectClusterRef.current(entries.map((entry) => entry.id))
            return
          }
          if (entries.length === 1) {
            onSelectPropertyRef.current(entries[0].id)
            return
          }
          const coordinates = entries[0].coordinates
          map.easeTo({ center: coordinates, zoom: Math.min(map.getZoom() + 2, 15) })
        })

        const longitude = entries.reduce((sum, entry) => sum + entry.coordinates[0], 0) / entries.length
        const latitude = entries.reduce((sum, entry) => sum + entry.coordinates[1], 0) / entries.length
        return [new maplibregl.Marker({ element, anchor: 'bottom' }).setLngLat([longitude, latitude]).addTo(map)]
      })
    }

    // `idle` may fire before the GeoJSON source finishes its first paint.
    // Keep the event listener for the normal path and add one delayed check
    // so the fallback does not depend on a particular MapLibre event order.
    retryTimer = window.setInterval(renderFallbackMarkers, 500)
    stopRetryTimer = window.setTimeout(() => {
      if (retryTimer !== undefined) window.clearInterval(retryTimer)
    }, 6000)
    map.once('idle', renderFallbackMarkers)
    map.on('moveend', renderFallbackMarkers)
    map.on('sourcedata', renderFallbackMarkers)
    map.triggerRepaint()

    return () => {
      cancelled = true
      map.off('moveend', renderFallbackMarkers)
      map.off('sourcedata', renderFallbackMarkers)
      if (retryTimer !== undefined) window.clearInterval(retryTimer)
      if (stopRetryTimer !== undefined) window.clearTimeout(stopRetryTimer)
      clearFallbackMarkers()
    }
  }, [mapReady, mapRef, sourceData])

  // Fit the initial results once. Later filter changes update features/clusters
  // but preserve the camera position chosen by the user.
  useEffect(() => {
    const map = mapRef.current
    const boundsAreEmpty = bounds.isEmpty()
    if (
      !map ||
      !mapReady ||
      !shouldFitInitialBounds(hasFittedInitialBoundsRef.current, boundsAreEmpty)
    ) return

    hasFittedInitialBoundsRef.current = true
    map.fitBounds(bounds, {
      padding: { top: 74, right: 74, bottom: 180, left: 74 },
      maxZoom: 13,
      duration: 500,
    })
  }, [bounds, mapReady, mapRef])

  // NOTE: We intentionally do NOT zoom/pan when selectedPropertyId changes.
  // The user already clicked the pin – no need to move the camera.

  const handleLocateMe = useCallback(() => {
    const map = mapRef.current
    if (!map) return

    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 13,
          duration: 1000,
        })
      },
      () => {
        // Geolocation denied or failed — silently ignore
      },
      { enableHighAccuracy: false, timeout: 5000 },
    )
  }, [mapRef])

  useEffect(() => {
    if (!locateTrigger) return
    handleLocateMe()
  }, [locateTrigger, handleLocateMe])

  return (
    <div className="map-card map-card--maplibre">
      <div
        ref={containerRef}
        className="maplibre-canvas"
        aria-label="Mapa de propiedades"
      />
      <MapLibreStatusOverlay
        status={mapStatus}
        onRetry={retryMap}
        errorHint="Puedes seguir usando los filtros y volver a intentarlo."
      />
    </div>
  )
}
