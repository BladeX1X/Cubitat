import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapPin } from 'lucide-react'
import { getOpenFreeMapStyle } from '../maps/lib/openFreeMapStyle'
import '../maps/lib/configureMapLibreWorker'
import { aggregateProvinceCounts, PROVINCE_MAP_CENTERS, type ProvinceCount } from './provinceAggregates'
import { resolveProvinceMapTarget } from './provinceMapInteractions'
import { MarketplaceMapCloseAction } from './MarketplaceMapToggle'

const SOURCE_ID = 'cubitat-marketplace-provinces'
const CLUSTERS_ID = 'cubitat-marketplace-province-clusters'
const CLUSTER_LABEL_ID = 'cubitat-marketplace-province-cluster-label'
const PROVINCES_ID = 'cubitat-marketplace-province-points'
const PROVINCE_LABEL_ID = 'cubitat-marketplace-province-labels'
const CUBA_MAP_BOUNDS: maplibregl.LngLatBoundsLike = [[-85.1, 19.5], [-73.5, 23.5]]

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
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onSelectRef = useRef(onSelectProvince)
  const featuresRef = useRef(features)
  const mapReadyRef = useRef(false)
  const [mapError, setMapError] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [isDesktopMap, setIsDesktopMap] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1021px)').matches)
  const onCloseRef = useRef(onClose)

  onSelectRef.current = onSelectProvince
  featuresRef.current = features
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
    const container = containerRef.current
    if (!container) return
    const controller = new AbortController()
    let resizeObserver: ResizeObserver | undefined
    void getOpenFreeMapStyle(controller.signal).then((style) => {
      if (controller.signal.aborted || !containerRef.current) return
      const map = new maplibregl.Map({ container, style, center: [-79.5, 21.8], zoom: 5.15, minZoom: 4, maxZoom: 11, attributionControl: false })
      mapRef.current = map
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
      // Reveal the map once its style and interactive layers are installed.
      // MapLibre's `load` waits for visible tiles/fonts to finish too, which can
      // leave a full-screen spinner covering an otherwise usable map on slow links.
      map.once('style.load', () => {
        if (controller.signal.aborted) return
        map.addSource(SOURCE_ID, {
          type: 'geojson', data: { type: 'FeatureCollection', features: featuresRef.current }, cluster: true, clusterRadius: 36,
          clusterProperties: { total_count: ['+', ['get', 'count']] },
        })
        map.addLayer({ id: CLUSTERS_ID, type: 'circle', source: SOURCE_ID, filter: ['has', 'point_count'], paint: { 'circle-color': accent, 'circle-radius': ['step', ['get', 'point_count'], 24, 4, 30, 8, 36], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } })
        map.addLayer({ id: CLUSTER_LABEL_ID, type: 'symbol', source: SOURCE_ID, filter: ['has', 'point_count'], layout: { 'text-field': ['to-string', ['get', 'total_count']], 'text-size': 13, 'text-font': ['Noto Sans Bold'] }, paint: { 'text-color': '#ffffff' } })
        map.addLayer({ id: PROVINCES_ID, type: 'circle', source: SOURCE_ID, filter: ['!', ['has', 'point_count']], paint: { 'circle-color': accent, 'circle-radius': 24, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } })
        map.addLayer({ id: PROVINCE_LABEL_ID, type: 'symbol', source: SOURCE_ID, filter: ['!', ['has', 'point_count']], layout: { 'text-field': ['to-string', ['get', 'count']], 'text-size': 12, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true }, paint: { 'text-color': '#ffffff' } })
        map.resize()
        map.fitBounds(CUBA_MAP_BOUNDS, { padding: 28, maxZoom: 5.8, duration: 0 })
        const interactiveLayers = [CLUSTER_LABEL_ID, CLUSTERS_ID, PROVINCE_LABEL_ID, PROVINCES_ID]
        map.on('click', (event) => {
          const target = resolveProvinceMapTarget(map.queryRenderedFeatures(event.point, { layers: interactiveLayers }))
          if (!target) return
          if (target.kind === 'province') {
            onSelectRef.current(target.province)
            return
          }
          const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource
          void source.getClusterExpansionZoom(target.clusterId).then((zoom) => {
            if (!controller.signal.aborted) map.easeTo({ center: target.center, zoom })
          }).catch(() => {
            // A stale cluster can disappear while the source is being refreshed.
          })
        })
        map.on('mousemove', (event) => {
          const hasTarget = resolveProvinceMapTarget(map.queryRenderedFeatures(event.point, { layers: interactiveLayers })) !== null
          map.getCanvas().style.cursor = hasTarget ? 'pointer' : ''
        })
        resizeObserver = new ResizeObserver(() => map.resize())
        resizeObserver.observe(container)
        mapReadyRef.current = true
        setMapReady(true)
      })
      map.on('error', () => {
        // Resource/tile errors can be transient; keep the map usable after its style loads.
        if (!controller.signal.aborted && !mapReadyRef.current) setMapError(true)
      })
    }).catch(() => { if (!controller.signal.aborted) setMapError(true) })
    return () => { controller.abort(); resizeObserver?.disconnect(); mapRef.current?.remove(); mapRef.current = null; mapReadyRef.current = false }
  // Map instance is intentionally created once; dynamic data and selection are updated below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryAttempt])

  useEffect(() => {
    const source = mapRef.current?.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (!source) return
    source.setData({ type: 'FeatureCollection', features })
  }, [features])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer(PROVINCES_ID)) return
    map.setPaintProperty(PROVINCES_ID, 'circle-color', accent)
    map.setPaintProperty(PROVINCES_ID, 'circle-radius', ['case', ['==', ['get', 'province'], selectedProvince], 28, 24])
    map.setLayoutProperty(PROVINCE_LABEL_ID, 'text-size', ['case', ['==', ['get', 'province'], selectedProvince], 14, 13])
  }, [selectedProvince, accent, mapReady])

  const panel = <section className={`marketplace-province-map relative z-[9999] flex min-h-0 flex-col overflow-hidden border border-neutral-200 bg-white ${isDesktopMap ? 'sticky top-4 h-[calc(100dvh-2rem)] rounded-2xl' : 'fixed inset-0 h-[100dvh] w-full border-0 pt-[env(safe-area-inset-top)]'}`} role={isDesktopMap ? undefined : 'dialog'} aria-modal={isDesktopMap ? undefined : true} aria-label={`Mapa de ${resultLabel} por provincia`}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
      <div><h2 className="flex items-center gap-2 font-bold text-neutral-900"><MapPin size={18} aria-hidden="true" />Mapa por provincia</h2><p className="text-sm text-neutral-600">Las cifras son resultados disponibles en cada provincia; no muestran direcciones exactas.</p></div>
      <div className="flex items-center gap-2">
        {selectedProvince && <button type="button" className="min-h-10 rounded-lg px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50" onClick={() => onSelectProvince('')}>Ver toda Cuba</button>}
      </div>
    </div>
    <div className="relative min-h-[300px] flex-1">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" role="application" aria-label={`Mapa interactivo. Selecciona una provincia para filtrar ${resultLabel}.`} />
      {(!mapReady || mapError) && <div className="absolute inset-0 flex items-center justify-center bg-neutral-100/90 px-6 text-center"><div><p className="font-semibold text-neutral-800">{mapError ? 'No se pudo cargar el mapa' : 'Cargando mapa…'}</p>{mapError && <><p className="mt-1 text-sm text-neutral-600">Puedes seguir usando los filtros de provincia.</p><button type="button" className="mt-4 min-h-11 rounded-lg bg-emerald-700 px-5 font-bold text-white hover:bg-emerald-800" onClick={() => { mapReadyRef.current = false; setMapReady(false); setMapError(false); setRetryAttempt((attempt) => attempt + 1) }}>Reintentar mapa</button></>}</div></div>}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 text-xs text-neutral-700 shadow">Selecciona un grupo para acercarte; una provincia para filtrar</div>
    </div>
    {!isDesktopMap && <MarketplaceMapCloseAction onClose={onClose} />}
  </section>

  return !isDesktopMap && typeof document !== 'undefined' ? createPortal(panel, document.body) : panel
}
