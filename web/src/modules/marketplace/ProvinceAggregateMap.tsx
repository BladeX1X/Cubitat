import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type * as maplibregl from 'maplibre-gl'
import { MapPin } from 'lucide-react'
import { useMapLibreMap } from '../maps/hooks/useMapLibreMap'
import { MapLibreStatusOverlay } from '../maps/components/MapLibreStatusOverlay'
import { aggregateProvinceCounts, PROVINCE_MAP_CENTERS, type ProvinceCount } from './provinceAggregates'
import { resolveProvinceMapTarget } from './provinceMapInteractions'
import { MarketplaceMapCloseAction } from './MarketplaceMapToggle'

const SOURCE_ID = 'cubitat-marketplace-provinces'
const CLUSTERS_ID = 'cubitat-marketplace-province-clusters'
const CLUSTER_LABEL_ID = 'cubitat-marketplace-province-cluster-label'
const PROVINCES_ID = 'cubitat-marketplace-province-points'
const PROVINCE_LABEL_ID = 'cubitat-marketplace-province-labels'
const CUBA_MAP_BOUNDS: maplibregl.LngLatBoundsLike = [[-85.1, 19.5], [-73.5, 23.5]]
const MAP_OPTIONS = { center: [-79.5, 21.8] as [number, number], zoom: 5.15, minZoom: 4, maxZoom: 11 }
const INTERACTIVE_LAYERS = [CLUSTER_LABEL_ID, CLUSTERS_ID, PROVINCE_LABEL_ID, PROVINCES_ID]

export function ProvinceAggregateMap({
  counts, selectedProvince, onSelectProvince, onClose, accent = '#047857', resultLabel = 'resultados',
}: {
  counts: ProvinceCount[]
  selectedProvince: string
  onSelectProvince: (province: string) => void
  onClose: () => void
  accent?: string
  resultLabel?: string
}) {
  const features = useMemo(() => aggregateProvinceCounts(counts).flatMap(({ province, count }) => {
    const center = PROVINCE_MAP_CENTERS[province]
    return center ? [{ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: center }, properties: { province, count } }] : []
  }), [counts])
  const containerRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef(features)
  const onSelectRef = useRef(onSelectProvince)
  const accentRef = useRef(accent)
  const [isDesktopMap, setIsDesktopMap] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1021px)').matches)
  const onCloseRef = useRef(onClose)
  const { mapRef, status: mapStatus, retry: retryMap } = useMapLibreMap(containerRef, MAP_OPTIONS)
  const mapReady = mapStatus === 'ready'

  onSelectRef.current = onSelectProvince
  featuresRef.current = features
  accentRef.current = accent
  onCloseRef.current = onClose

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1021px)')
    const update = () => setIsDesktopMap(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (isDesktopMap) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isDesktopMap])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    map.addSource(SOURCE_ID, {
      type: 'geojson', data: { type: 'FeatureCollection', features: featuresRef.current }, cluster: true, clusterRadius: 36,
      clusterProperties: { total_count: ['+', ['get', 'count']] },
    })
    map.addLayer({ id: CLUSTERS_ID, type: 'circle', source: SOURCE_ID, filter: ['has', 'point_count'], paint: { 'circle-color': accentRef.current, 'circle-radius': ['step', ['get', 'point_count'], 24, 4, 30, 8, 36], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } })
    map.addLayer({ id: CLUSTER_LABEL_ID, type: 'symbol', source: SOURCE_ID, filter: ['has', 'point_count'], layout: { 'text-field': ['to-string', ['get', 'total_count']], 'text-size': 13, 'text-font': ['Noto Sans Bold'] }, paint: { 'text-color': '#ffffff' } })
    map.addLayer({ id: PROVINCES_ID, type: 'circle', source: SOURCE_ID, filter: ['!', ['has', 'point_count']], paint: { 'circle-color': accentRef.current, 'circle-radius': 24, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } })
    map.addLayer({ id: PROVINCE_LABEL_ID, type: 'symbol', source: SOURCE_ID, filter: ['!', ['has', 'point_count']], layout: { 'text-field': ['to-string', ['get', 'count']], 'text-size': 12, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true }, paint: { 'text-color': '#ffffff' } })
    map.fitBounds(CUBA_MAP_BOUNDS, { padding: 28, maxZoom: 5.8, duration: 0 })

    const handleMapClick = (event: maplibregl.MapMouseEvent) => {
      const target = resolveProvinceMapTarget(map.queryRenderedFeatures(event.point, { layers: INTERACTIVE_LAYERS }))
      if (!target) return
      if (target.kind === 'province') {
        onSelectRef.current(target.province)
        return
      }
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource
      void source.getClusterExpansionZoom(target.clusterId).then((zoom) => {
        if (mapRef.current === map) map.easeTo({ center: target.center, zoom })
      }).catch(() => {
        // A stale cluster can disappear while the source is being refreshed.
      })
    }
    const handleMouseMove = (event: maplibregl.MapMouseEvent) => {
      const hasTarget = resolveProvinceMapTarget(map.queryRenderedFeatures(event.point, { layers: INTERACTIVE_LAYERS })) !== null
      map.getCanvas().style.cursor = hasTarget ? 'pointer' : ''
    }
    map.on('click', handleMapClick)
    map.on('mousemove', handleMouseMove)

    return () => {
      map.off('click', handleMapClick)
      map.off('mousemove', handleMouseMove)
    }
  }, [mapReady, mapRef])

  useEffect(() => {
    const source = mapRef.current?.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (!source || !mapReady) return
    source.setData({ type: 'FeatureCollection', features })
  }, [features, mapReady, mapRef])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer(PROVINCES_ID)) return
    map.setPaintProperty(PROVINCES_ID, 'circle-color', accent)
    map.setPaintProperty(PROVINCES_ID, 'circle-radius', ['case', ['==', ['get', 'province'], selectedProvince], 28, 24])
    map.setLayoutProperty(PROVINCE_LABEL_ID, 'text-size', ['case', ['==', ['get', 'province'], selectedProvince], 14, 13])
  }, [selectedProvince, accent, mapReady, mapRef])

  const panel = <section className={`marketplace-province-map relative z-[9999] flex min-h-0 flex-col overflow-hidden border border-neutral-200 bg-white ${isDesktopMap ? 'sticky top-4 h-[calc(100dvh-2rem)] rounded-2xl' : 'fixed inset-0 h-[100dvh] w-full border-0 pt-[env(safe-area-inset-top)]'}`} role={isDesktopMap ? undefined : 'dialog'} aria-modal={isDesktopMap ? undefined : true} aria-label={`Mapa de ${resultLabel} por provincia`}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
      <div><h2 className="flex items-center gap-2 font-bold text-neutral-900"><MapPin size={18} aria-hidden="true" />Mapa por provincia</h2><p className="text-sm text-neutral-600">Las cifras son resultados disponibles en cada provincia; no muestran direcciones exactas.</p></div>
      <div className="flex items-center gap-2">
        {selectedProvince && <button type="button" className="min-h-10 rounded-lg px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50" onClick={() => onSelectProvince('')}>Ver toda Cuba</button>}
      </div>
    </div>
    <div className="relative min-h-[300px] flex-1">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" role="application" aria-label={`Mapa interactivo. Selecciona una provincia para filtrar ${resultLabel}.`} />
      <MapLibreStatusOverlay
        status={mapStatus}
        onRetry={retryMap}
        errorHint="Puedes seguir usando los filtros de provincia."
      />
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 text-xs text-neutral-700 shadow">Selecciona un grupo para acercarte; una provincia para filtrar</div>
    </div>
    {!isDesktopMap && <MarketplaceMapCloseAction onClose={onClose} />}
  </section>

  return !isDesktopMap && typeof document !== 'undefined' ? createPortal(panel, document.body) : panel
}
