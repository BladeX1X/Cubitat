import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../lib/configureMapLibreWorker'
import type { FeatureCollection, Point } from 'geojson'
import type { MapAdapterProps } from '../types'
import { getOpenFreeMapStyle } from '../lib/openFreeMapStyle'
import { approximatePropertyCoordinates } from '../lib/propertyCoordinates'
import {
  createPropertySourceData,
  getSelectedMapFeatures,
  groupMapFeaturesByScreenCell,
} from '../lib/propertySourceData'
import { observeElementResize } from '../lib/observeElementResize'
import { shouldFitInitialBounds } from '../lib/mapCamera'
import { classifyMapError, classifyMapErrorResource } from '../lib/mapErrorDiagnostics'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'

const PROPERTY_SOURCE_ID = 'cubitat-properties'
const CLUSTER_SELECTED_HALO_LAYER_ID = 'property-cluster-selected-halo'
const CLUSTER_LAYER_ID = 'property-clusters'
const CLUSTER_COUNT_LAYER_ID = 'property-cluster-count'
const PROPERTY_SELECTED_HALO_LAYER_ID = 'property-selected-halo'
const PROPERTY_POINT_LAYER_ID = 'property-points'
const PROPERTY_LABEL_LAYER_ID = 'property-labels'

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
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onSelectPropertyRef = useRef(onSelectProperty)
  const onSelectClusterRef = useRef(onSelectCluster)
  const onViewportChangeRef = useRef(onViewportChange)
  const sourceDataRef = useRef<FeatureCollection<Point>>(createPropertySourceData([], undefined))
  const fallbackMarkersRef = useRef<maplibregl.Marker[]>([])
  const hasFittedInitialBoundsRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)

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
    if (!containerRef.current || mapRef.current) return

    const abortController = new AbortController()

    async function initializeMap() {
      if (!containerRef.current || mapRef.current) return

      const style = await getOpenFreeMapStyle(abortController.signal)

      mapRef.current = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [-79.5, 21.8],
        zoom: 5.15,
        minZoom: 2,
        maxZoom: 15,
        attributionControl: false,
      })

      const reportedMapErrors = new Set<string>()
      mapRef.current.on('error', (event) => {
        if (abortController.signal.aborted) return

        const errorEvent = event as maplibregl.ErrorEvent & { sourceId?: unknown }
        const resource = classifyMapErrorResource(errorEvent.sourceId)
        const code = classifyMapError(errorEvent.error)
        const signature = `${resource}:${code}`
        if (reportedMapErrors.has(signature)) return
        reportedMapErrors.add(signature)

        logSafeEvent({
          module: 'maps',
          action: 'maplibre_resource',
          level: 'error',
          code,
          context: { resource },
        })
      })

      mapRef.current.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        'top-right',
      )
      mapRef.current.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        'bottom-right',
      )
      const markMapReady = () => {
        if (!abortController.signal.aborted) {
          setMapReady(true)
        }
      }

      mapRef.current.on('load', markMapReady)
      mapRef.current.on('styledata', markMapReady)
      mapRef.current.on('idle', markMapReady)
      mapRef.current.on('render', markMapReady)
      const readyFallback = window.setTimeout(markMapReady, 2000)

      mapRef.current.once('remove', () => window.clearTimeout(readyFallback))
    }

    initializeMap().catch((error: unknown) => {
      if (!abortController.signal.aborted) {
        logSafeEvent({
          module: 'maps',
          action: 'init_maplibre',
          level: 'error',
          code: sanitizeErrorReason(error),
        })
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
            map.resize()
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
  }, [mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    const existingSource = map.getSource(PROPERTY_SOURCE_ID)
    if (existingSource) {
      ;(existingSource as maplibregl.GeoJSONSource).setData(sourceData)
    }
  }, [mapReady, sourceData])

  // Use DOM markers for selected results so regrouping on zoom cannot lose
  // their selected state. Also keep a fallback for MapLibre styles that fail
  // to paint their GeoJSON layers.
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

      const selectedFeatures = getSelectedMapFeatures(sourceDataRef.current.features)
      const hasSelectedResults = selectedFeatures.length > 0
      const mapLayers = [
        CLUSTER_SELECTED_HALO_LAYER_ID,
        CLUSTER_LAYER_ID,
        CLUSTER_COUNT_LAYER_ID,
        PROPERTY_SELECTED_HALO_LAYER_ID,
        PROPERTY_POINT_LAYER_ID,
        PROPERTY_LABEL_LAYER_ID,
      ]
      const visibility = hasSelectedResults ? 'none' : 'visible'
      mapLayers.forEach((layerId) => {
        if (map.getLayer(layerId) && map.getLayoutProperty(layerId, 'visibility') !== visibility) {
          map.setLayoutProperty(layerId, 'visibility', visibility)
        }
      })

      let renderedFeatureCount = 0
      if (!hasSelectedResults) {
        try {
          renderedFeatureCount = map.queryRenderedFeatures({ layers: mapLayers }).length
        } catch {
          renderedFeatureCount = 0
        }
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
      const markerFeatures = hasSelectedResults ? selectedFeatures : sourceDataRef.current.features
      const groups = groupMapFeaturesByScreenCell(markerFeatures, (feature) => {
        const pixel = map.project(feature.geometry.coordinates as [number, number])
        return [pixel.x, pixel.y]
      })

      const signature = groups
        .map(({ key, features }) => `${key}:${features.map((feature) => feature.properties?.id).join(',')}`)
        .sort()
        .join('|')
      if (signature === lastFallbackSignature) return
      lastFallbackSignature = signature
      clearFallbackMarkers()

      fallbackMarkersRef.current = groups.flatMap(({ features }) => {
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
  }, [mapReady, sourceData])

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
  }, [bounds, mapReady])

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
  }, [])

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
    </div>
  )
}
