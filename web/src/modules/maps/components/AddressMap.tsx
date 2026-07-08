import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { StyleSpecification } from 'maplibre-gl'

const OPEN_SOURCE_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

// Centro geográfico aproximado de cada provincia de Cuba
const PROVINCE_CENTERS: Record<string, { lng: number; lat: number; zoom: number }> = {
  'La Habana':          { lng: -82.3666, lat: 23.1136, zoom: 11 },
  'Artemisa':           { lng: -82.7588, lat: 22.8145, zoom: 10 },
  'Mayabeque':          { lng: -82.0231, lat: 22.8948, zoom: 10 },
  'Pinar del Río':      { lng: -83.6903, lat: 22.4164, zoom: 9  },
  'Matanzas':           { lng: -81.5774, lat: 22.9567, zoom: 9  },
  'Villa Clara':        { lng: -79.9973, lat: 22.4065, zoom: 9  },
  'Cienfuegos':         { lng: -80.4416, lat: 22.1493, zoom: 10 },
  'Sancti Spíritus':    { lng: -79.4369, lat: 21.9298, zoom: 9  },
  'Ciego de Ávila':     { lng: -78.7661, lat: 21.8490, zoom: 9  },
  'Camagüey':           { lng: -77.9193, lat: 21.3808, zoom: 9  },
  'Las Tunas':          { lng: -76.9542, lat: 20.9715, zoom: 9  },
  'Granma':             { lng: -76.6444, lat: 20.3847, zoom: 9  },
  'Holguín':            { lng: -76.2617, lat: 20.8874, zoom: 9  },
  'Santiago de Cuba':   { lng: -75.8224, lat: 20.0244, zoom: 10 },
  'Guantánamo':         { lng: -75.2105, lat: 20.1450, zoom: 9  },
  'Isla de la Juventud':{ lng: -82.8271, lat: 21.8679, zoom: 9  },
}

// Centro geográfico aproximado de municipios por provincia
const MUNICIPALITY_CENTERS: Record<string, { lng: number; lat: number; zoom: number }> = {
  // ── La Habana ─────────────────────────────────────────────────
  'Playa':                   { lng: -82.4377, lat: 23.1241, zoom: 13 },
  'Plaza de la Revolución':  { lng: -82.3831, lat: 23.1209, zoom: 14 },
  'Centro Habana':           { lng: -82.3709, lat: 23.1341, zoom: 14 },
  'La Habana Vieja':         { lng: -82.3530, lat: 23.1368, zoom: 14 },
  'Regla':                   { lng: -82.3393, lat: 23.1152, zoom: 14 },
  'La Habana del Este':      { lng: -82.2986, lat: 23.1424, zoom: 12 },
  'Guanabacoa':              { lng: -82.2974, lat: 23.1227, zoom: 13 },
  'San Miguel del Padrón':   { lng: -82.3247, lat: 23.0926, zoom: 13 },
  'Diez de Octubre':         { lng: -82.3537, lat: 23.0990, zoom: 13 },
  'Cerro':                   { lng: -82.3803, lat: 23.0999, zoom: 13 },
  'Marianao':                { lng: -82.4341, lat: 23.0846, zoom: 13 },
  'La Lisa':                 { lng: -82.4623, lat: 23.0638, zoom: 13 },
  'Boyeros':                 { lng: -82.4039, lat: 22.9983, zoom: 12 },
  'Arroyo Naranjo':          { lng: -82.3548, lat: 23.0388, zoom: 12 },
  'Cotorro':                 { lng: -82.2900, lat: 23.0306, zoom: 13 },

  // ── Matanzas ──────────────────────────────────────────────────
  'Matanzas':                { lng: -81.5774, lat: 23.0419, zoom: 13 },
  'Cárdenas':                { lng: -81.2025, lat: 23.0422, zoom: 13 },
  'Colón':                   { lng: -80.9039, lat: 22.7228, zoom: 13 },
  'Jovellanos':              { lng: -81.1964, lat: 22.8108, zoom: 13 },
  'Jagüey Grande':           { lng: -81.1269, lat: 22.5289, zoom: 13 },
  'Calimete':                { lng: -80.9058, lat: 22.5399, zoom: 13 },
  'Ciénaga de Zapata':       { lng: -81.5092, lat: 22.3700, zoom: 11 },
  'Limonar':                 { lng: -81.4050, lat: 22.9530, zoom: 13 },
  'Los Arabos':              { lng: -80.7408, lat: 22.7725, zoom: 13 },
  'Martí':                   { lng: -80.9128, lat: 22.9907, zoom: 13 },
  'Pedro Betancourt':        { lng: -81.2746, lat: 22.7236, zoom: 13 },
  'Perico':                  { lng: -81.0010, lat: 22.7749, zoom: 13 },
  'Unión de Reyes':          { lng: -81.5333, lat: 22.7961, zoom: 13 },

  // ── Santiago de Cuba ──────────────────────────────────────────
  'Santiago de Cuba':        { lng: -75.8224, lat: 20.0244, zoom: 13 },
  'Contramaestre':           { lng: -76.2437, lat: 20.2994, zoom: 13 },
  'Guamá':                   { lng: -76.3900, lat: 19.9350, zoom: 12 },
  'Mella':                   { lng: -75.7700, lat: 20.2700, zoom: 13 },
  'Palma Soriano':           { lng: -75.9894, lat: 20.2162, zoom: 13 },
  'San Luis':                { lng: -75.8547, lat: 20.1876, zoom: 13 },
  'Segundo Frente':          { lng: -75.5500, lat: 20.4600, zoom: 12 },
  'Songo - La Maya':         { lng: -75.7200, lat: 20.2200, zoom: 13 },
  'Tercer Frente':           { lng: -75.7850, lat: 20.1050, zoom: 12 },

  // ── Pinar del Río ─────────────────────────────────────────────
  'Pinar del Río':           { lng: -83.6903, lat: 22.4164, zoom: 13 },
  'Consolación del Sur':     { lng: -83.5217, lat: 22.5078, zoom: 13 },
  'Guane':                   { lng: -84.0844, lat: 22.1986, zoom: 13 },
  'La Palma':                { lng: -83.5490, lat: 22.7480, zoom: 13 },
  'Los Palacios':            { lng: -83.2497, lat: 22.5914, zoom: 13 },
  'Mantua':                  { lng: -84.2900, lat: 22.2900, zoom: 13 },
  'Minas de Matahambre':     { lng: -83.9450, lat: 22.5850, zoom: 13 },
  'San Juan y Martínez':     { lng: -83.8330, lat: 22.2636, zoom: 13 },
  'Sandino':                 { lng: -84.2200, lat: 22.2300, zoom: 13 },
  'Viñales':                 { lng: -83.7144, lat: 22.6159, zoom: 13 },

  // ── Artemisa ──────────────────────────────────────────────────
  'Artemisa':                { lng: -82.7588, lat: 22.8145, zoom: 13 },
  'Alquízar':                { lng: -82.5800, lat: 22.7800, zoom: 13 },
  'Bahía Honda':             { lng: -83.1600, lat: 22.9020, zoom: 13 },
  'Bauta':                   { lng: -82.5441, lat: 22.9903, zoom: 13 },
  'Caimito':                 { lng: -82.5900, lat: 22.9600, zoom: 13 },
  'Candelaria':              { lng: -82.9500, lat: 22.7350, zoom: 13 },
  'Guanajay':                { lng: -82.6879, lat: 22.9264, zoom: 13 },
  'Güira de Melena':         { lng: -82.5100, lat: 22.7900, zoom: 13 },
  'Mariel':                  { lng: -82.7569, lat: 22.9922, zoom: 13 },
  'San Antonio de los Baños':{ lng: -82.4994, lat: 22.8978, zoom: 13 },
  'San Cristóbal':           { lng: -83.0500, lat: 22.7150, zoom: 13 },

  // ── Mayabeque ─────────────────────────────────────────────────
  'San José de las Lajas':   { lng: -82.1558, lat: 22.9627, zoom: 13 },
  'Batabanó':                { lng: -82.2900, lat: 22.6800, zoom: 13 },
  'Bejucal':                 { lng: -82.3800, lat: 22.9200, zoom: 13 },
  'Güines':                  { lng: -82.0252, lat: 22.8447, zoom: 13 },
  'Jaruco':                  { lng: -81.9900, lat: 23.0400, zoom: 13 },
  'Madruga':                 { lng: -81.8600, lat: 22.9050, zoom: 13 },
  'Melena del Sur':          { lng: -82.1500, lat: 22.7800, zoom: 13 },
  'Nueva Paz':               { lng: -81.7600, lat: 22.7700, zoom: 13 },
  'Quivicán':                { lng: -82.3600, lat: 22.8100, zoom: 13 },
  'San Nicolás':             { lng: -81.9100, lat: 22.7600, zoom: 13 },
  'Santa Cruz del Norte':    { lng: -81.9169, lat: 23.1563, zoom: 13 },

  // ── Villa Clara ───────────────────────────────────────────────
  'Santa Clara':             { lng: -79.9973, lat: 22.4065, zoom: 13 },
  'Caibarién':               { lng: -79.4747, lat: 22.5148, zoom: 13 },
  'Camajuaní':               { lng: -79.7300, lat: 22.4700, zoom: 13 },
  'Cifuentes':               { lng: -80.0800, lat: 22.6400, zoom: 13 },
  'Corralillo':              { lng: -80.5900, lat: 22.9800, zoom: 13 },
  'Encrucijada':             { lng: -80.2300, lat: 22.6100, zoom: 13 },
  'Manicaragua':             { lng: -79.9700, lat: 22.1400, zoom: 13 },
  'Placetas':                { lng: -79.6600, lat: 22.3100, zoom: 13 },
  'Quemado de Güines':       { lng: -80.2600, lat: 22.8000, zoom: 13 },
  'Ranchuelo':               { lng: -80.1500, lat: 22.3800, zoom: 13 },
  'Remedios':                { lng: -79.5400, lat: 22.4900, zoom: 13 },
  'Sagua la Grande':         { lng: -80.0728, lat: 22.8087, zoom: 13 },
  'Santo Domingo':           { lng: -80.2400, lat: 22.5700, zoom: 13 },

  // ── Cienfuegos ────────────────────────────────────────────────
  'Cienfuegos':              { lng: -80.4416, lat: 22.1493, zoom: 13 },
  'Abreus':                  { lng: -80.5700, lat: 22.1900, zoom: 13 },
  'Aguada de Pasajeros':     { lng: -80.8400, lat: 22.3800, zoom: 13 },
  'Cruces':                  { lng: -80.2700, lat: 22.3400, zoom: 13 },
  'Cumanayagua':             { lng: -80.2000, lat: 22.1600, zoom: 13 },
  'Lajas':                   { lng: -80.3000, lat: 22.4100, zoom: 13 },
  'Palmira':                 { lng: -80.3908, lat: 22.2553, zoom: 13 },
  'Rodas':                   { lng: -80.5600, lat: 22.3400, zoom: 13 },

  // ── Sancti Spíritus ───────────────────────────────────────────
  'Sancti Spíritus':         { lng: -79.4369, lat: 21.9298, zoom: 13 },
  'Cabaiguán':               { lng: -79.5000, lat: 22.0800, zoom: 13 },
  'Fomento':                 { lng: -79.7200, lat: 22.0900, zoom: 13 },
  'Jatibonico':              { lng: -79.1600, lat: 21.9700, zoom: 13 },
  'La Sierpe':               { lng: -78.9700, lat: 21.7400, zoom: 12 },
  'Taguasco':                { lng: -79.2700, lat: 22.0000, zoom: 13 },
  'Trinidad':                { lng: -79.9836, lat: 21.8025, zoom: 13 },
  'Yaguajay':                { lng: -79.2300, lat: 22.3300, zoom: 13 },

  // ── Ciego de Ávila ────────────────────────────────────────────
  'Ciego de Ávila':          { lng: -78.7661, lat: 21.8490, zoom: 13 },
  'Baraguá':                 { lng: -78.6200, lat: 21.7200, zoom: 13 },
  'Bolivia':                 { lng: -78.7400, lat: 22.2800, zoom: 13 },
  'Chambas':                 { lng: -78.9100, lat: 22.1900, zoom: 13 },
  'Ciro Redondo':            { lng: -78.7000, lat: 22.0100, zoom: 13 },
  'Florencia':               { lng: -78.9600, lat: 22.1400, zoom: 13 },
  'Majagua':                 { lng: -78.9900, lat: 21.9200, zoom: 13 },
  'Morón':                   { lng: -78.6194, lat: 22.1073, zoom: 13 },
  'Primero de Enero':        { lng: -78.4300, lat: 21.9400, zoom: 13 },
  'Venezuela':               { lng: -78.7900, lat: 21.7300, zoom: 13 },

  // ── Camagüey ──────────────────────────────────────────────────
  'Camagüey':                { lng: -77.9193, lat: 21.3808, zoom: 13 },
  'Carlos Manuel de Céspedes':{ lng: -78.2800, lat: 21.4400, zoom: 13 },
  'Esmeralda':               { lng: -78.1200, lat: 21.8500, zoom: 13 },
  'Florida':                 { lng: -78.2265, lat: 21.5294, zoom: 13 },
  'Guáimaro':                { lng: -77.3400, lat: 21.0400, zoom: 13 },
  'Jimaguayú':               { lng: -77.7800, lat: 21.2500, zoom: 13 },
  'Minas':                   { lng: -77.6100, lat: 21.4900, zoom: 13 },
  'Najasa':                  { lng: -77.7500, lat: 21.0900, zoom: 12 },
  'Nuevitas':                { lng: -77.2614, lat: 21.5406, zoom: 13 },
  'Santa Cruz del Sur':      { lng: -78.0000, lat: 20.7200, zoom: 13 },
  'Sibanicú':                { lng: -77.5400, lat: 21.2400, zoom: 13 },
  'Sierra de Cubitas':       { lng: -77.6200, lat: 21.6400, zoom: 12 },
  'Vertientes':              { lng: -78.1600, lat: 21.2600, zoom: 13 },

  // ── Las Tunas ─────────────────────────────────────────────────
  'Las Tunas':               { lng: -76.9542, lat: 20.9715, zoom: 13 },
  'Amancio':                 { lng: -77.5800, lat: 20.8200, zoom: 13 },
  'Colombia':                { lng: -76.7000, lat: 21.0800, zoom: 13 },
  'Jesús Menéndez':          { lng: -76.4700, lat: 21.1600, zoom: 13 },
  'Jobabo':                  { lng: -77.2800, lat: 21.0700, zoom: 13 },
  'Majibacoa':               { lng: -76.9800, lat: 20.8700, zoom: 13 },
  'Manatí':                  { lng: -77.0000, lat: 21.3000, zoom: 13 },
  'Puerto Padre':            { lng: -76.5975, lat: 21.1961, zoom: 13 },

  // ── Granma ────────────────────────────────────────────────────
  'Bayamo':                  { lng: -76.6444, lat: 20.3847, zoom: 13 },
  'Bartolomé Masó':          { lng: -76.9400, lat: 20.1700, zoom: 13 },
  'Buey Arriba':             { lng: -76.7000, lat: 20.0500, zoom: 13 },
  'Campechuela':             { lng: -77.2800, lat: 20.2300, zoom: 13 },
  'Cauto Cristo':            { lng: -76.4400, lat: 20.5600, zoom: 13 },
  'Guisa':                   { lng: -76.6600, lat: 20.2500, zoom: 13 },
  'Jiguaní':                 { lng: -76.4200, lat: 20.3700, zoom: 13 },
  'Manzanillo':              { lng: -77.1164, lat: 20.3408, zoom: 13 },
  'Media Luna':              { lng: -77.4600, lat: 20.1500, zoom: 13 },
  'Niquero':                 { lng: -77.5800, lat: 20.0400, zoom: 13 },
  'Pilón':                   { lng: -77.3300, lat: 19.9100, zoom: 13 },
  'Río Cauto':               { lng: -76.5900, lat: 20.5800, zoom: 13 },
  'Yara':                    { lng: -76.9600, lat: 20.2700, zoom: 13 },

  // ── Holguín ───────────────────────────────────────────────────
  'Holguín':                 { lng: -76.2617, lat: 20.8874, zoom: 13 },
  'Antilla':                 { lng: -75.7300, lat: 20.8400, zoom: 13 },
  'Báguano':                 { lng: -76.0200, lat: 20.7400, zoom: 13 },
  'Banes':                   { lng: -75.7178, lat: 20.9636, zoom: 13 },
  'Cacocum':                 { lng: -76.3300, lat: 20.7200, zoom: 13 },
  'Calixto García':          { lng: -76.5200, lat: 20.7500, zoom: 13 },
  'Cueto':                   { lng: -75.9300, lat: 20.6500, zoom: 13 },
  'Frank País':              { lng: -75.7100, lat: 20.8400, zoom: 13 },
  'Gibara':                  { lng: -76.1300, lat: 21.1075, zoom: 13 },
  'Mayarí':                  { lng: -75.6800, lat: 20.6600, zoom: 13 },
  'Moa':                     { lng: -74.9383, lat: 20.6556, zoom: 13 },
  'Rafael Freyre':           { lng: -75.8500, lat: 21.0400, zoom: 13 },
  'Sagua de Tánamo':         { lng: -75.2400, lat: 20.5800, zoom: 13 },
  'Urbano Noris':            { lng: -75.8200, lat: 20.6000, zoom: 13 },

  // ── Guantánamo ────────────────────────────────────────────────
  'Guantánamo':              { lng: -75.2105, lat: 20.1450, zoom: 13 },
  'Baracoa':                 { lng: -74.4976, lat: 20.3472, zoom: 13 },
  'Caimanera':               { lng: -75.1600, lat: 19.9900, zoom: 13 },
  'El Salvador':             { lng: -75.2300, lat: 20.2200, zoom: 13 },
  'Imías':                   { lng: -74.6500, lat: 20.0700, zoom: 13 },
  'Maisí':                   { lng: -74.1400, lat: 20.2400, zoom: 12 },
  'Manuel Tames':            { lng: -75.1000, lat: 20.0800, zoom: 13 },
  'Niceto Pérez':            { lng: -75.3700, lat: 20.1000, zoom: 13 },
  'San Antonio del Sur':     { lng: -74.8100, lat: 20.0500, zoom: 13 },
  'Yateras':                 { lng: -75.1300, lat: 20.2500, zoom: 13 },

  // ── Isla de la Juventud ───────────────────────────────────────
  'Isla de la Juventud':     { lng: -82.8271, lat: 21.8679, zoom: 12 },
}

export type AddressMapProps = {
  province: string
  municipality: string
  latitude: number | null
  longitude: number | null
  onCoordinatesChange: (lat: number, lng: number) => void
}

export function AddressMap({ province, municipality, latitude, longitude, onCoordinatesChange }: AddressMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const onCoordinatesRef = useRef(onCoordinatesChange)
  const initialCenterRef = useRef(
    (municipality && MUNICIPALITY_CENTERS[municipality]) ||
      (province && PROVINCE_CENTERS[province]) ||
      PROVINCE_CENTERS['La Habana']
  )

  // Keep callback ref stable
  useEffect(() => {
    onCoordinatesRef.current = onCoordinatesChange
  }, [onCoordinatesChange])

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const abortController = new AbortController()

    async function initMap() {
      if (!containerRef.current || mapRef.current) return
      try {
        const resp = await fetch(OPEN_SOURCE_STYLE, { signal: abortController.signal })
        const style = (await resp.json()) as StyleSpecification
        const initialCenter = initialCenterRef.current

        mapRef.current = new maplibregl.Map({
          container: containerRef.current,
          style,
          center: [initialCenter.lng, initialCenter.lat],
          zoom: initialCenter.zoom,
          attributionControl: false,
        })

        mapRef.current.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          'top-right'
        )

        mapRef.current.on('load', () => {
          if (!abortController.signal.aborted) {
            setMapReady(true)
          }
        })

        // Click on map: place/move marker and emit coordinates
        mapRef.current.on('click', (e) => {
          const { lng, lat } = e.lngLat
          placeMarker(lng, lat)
          onCoordinatesRef.current(lat, lng)
        })
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error('[AddressMap] Error inicializando el mapa:', err)
        }
      }
    }

    initMap()

    return () => {
      abortController.abort()
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
      setMapReady(false)
    }
  }, [])

  // Fly to municipality first, fallback to province
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    if (municipality && MUNICIPALITY_CENTERS[municipality]) {
      const center = MUNICIPALITY_CENTERS[municipality]
      mapRef.current.flyTo({
        center: [center.lng, center.lat],
        zoom: center.zoom,
        speed: 1.4,
        curve: 1.2,
        essential: true,
      })
    } else if (province && PROVINCE_CENTERS[province]) {
      const center = PROVINCE_CENTERS[province]
      mapRef.current.flyTo({
        center: [center.lng, center.lat],
        zoom: center.zoom,
        speed: 1.4,
        curve: 1.2,
        essential: true,
      })
    }
  }, [province, municipality, mapReady])

  // Update marker if lat/lng change externally
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    if (latitude !== null && longitude !== null) {
      placeMarker(longitude, latitude)
    }
  }, [latitude, longitude, mapReady])

  function placeMarker(lng: number, lat: number) {
    if (!mapRef.current) return
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat])
    } else {
      markerRef.current = new maplibregl.Marker({ color: '#035f53', draggable: true })
        .setLngLat([lng, lat])
        .addTo(mapRef.current)

      // Allow drag-to-reposition as well
      markerRef.current.on('dragend', () => {
        const lngLat = markerRef.current?.getLngLat()
        if (lngLat) {
          onCoordinatesRef.current(lngLat.lat, lngLat.lng)
        }
      })
    }
  }

  return (
    <div className="relative w-full h-full min-h-[280px] rounded-xl overflow-hidden border border-neutral-200 shadow-sm">
      <div ref={containerRef} className="w-full h-full min-h-[280px]" />

      {!mapReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-50">
          <div className="w-6 h-6 border-2 border-[#035f53] border-t-transparent rounded-full animate-spin" />
          <p className="text-[11px] text-neutral-500 font-medium">Cargando mapa…</p>
        </div>
      )}

      <div className="absolute bottom-2 left-2 z-10 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px] font-medium text-neutral-600 shadow-sm border border-neutral-200">
        📍 Haz clic para marcar la ubicación exacta
      </div>
    </div>
  )
}
