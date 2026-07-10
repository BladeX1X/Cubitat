import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection, Point } from 'geojson'
import { formatPrice } from '../../../shared/lib/formatPrice'
import type { Property } from '../../properties/types'
import type { MapAdapterProps } from '../types'
import { getOpenFreeMapStyle } from '../lib/openFreeMapStyle'

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
    () => createPropertySourceData(properties, selectedPropertyId),
    [properties, selectedPropertyId],
  )

  useEffect(() => {
    sourceDataRef.current = sourceData
  }, [sourceData])

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
            .map((leaf) => leaf.properties?.id as string | undefined)
            .filter((id): id is string => !!id)
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

    const handleViewportChange = (event: maplibregl.MapLibreEvent) => {
      if (event.originalEvent) {
        onViewportChangeRef.current?.(getVisiblePropertyIds())
      }
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

    // Fire initial viewport change after the map renders
    requestAnimationFrame(() => {
      onViewportChangeRef.current?.(getVisiblePropertyIds())
    })

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

  // When the property list (bounds) changes, fit the map to show all results.
  // maxZoom: 13 so a municipality-level search zooms in properly.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: { top: 74, right: 74, bottom: 180, left: 74 },
        maxZoom: 13,
        duration: 500,
      })
    }
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

function createPropertySourceData(
  properties: Property[],
  selectedPropertyId?: string,
): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: properties.map((property) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          property.coordinates.longitude,
          property.coordinates.latitude,
        ],
      },
      properties: {
        id: property.id,
        title: property.title,
        label:
          property.operation === 'permuta'
            ? 'Permuta'
            : formatPrice(property.priceUsd),
        isSelected: property.id === selectedPropertyId,
      },
    })),
  }
}
