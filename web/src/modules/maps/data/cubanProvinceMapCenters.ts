export type ProvinceMapCenter = {
  lng: number
  lat: number
  zoom: number
}

export const CUBAN_PROVINCE_MAP_CENTERS: Record<string, ProvinceMapCenter> = {
  'La Habana': { lng: -82.3666, lat: 23.1136, zoom: 11 },
  Artemisa: { lng: -82.7588, lat: 22.8145, zoom: 10 },
  Mayabeque: { lng: -82.0231, lat: 22.8948, zoom: 10 },
  'Pinar del Río': { lng: -83.6903, lat: 22.4164, zoom: 9 },
  Matanzas: { lng: -81.5774, lat: 22.9567, zoom: 9 },
  'Villa Clara': { lng: -79.9973, lat: 22.4065, zoom: 9 },
  Cienfuegos: { lng: -80.4416, lat: 22.1493, zoom: 10 },
  'Sancti Spíritus': { lng: -79.4369, lat: 21.9298, zoom: 9 },
  'Ciego de Ávila': { lng: -78.7661, lat: 21.8490, zoom: 9 },
  Camagüey: { lng: -77.9193, lat: 21.3808, zoom: 9 },
  'Las Tunas': { lng: -76.9542, lat: 20.9715, zoom: 9 },
  Granma: { lng: -76.6444, lat: 20.3847, zoom: 9 },
  Holguín: { lng: -76.2617, lat: 20.8874, zoom: 9 },
  'Santiago de Cuba': { lng: -75.8224, lat: 20.0244, zoom: 10 },
  Guantánamo: { lng: -75.2105, lat: 20.1450, zoom: 9 },
  'Isla de la Juventud': { lng: -82.8271, lat: 21.8679, zoom: 9 },
}

export function getCubanProvinceMapCenter(province: string): [number, number] | null {
  const center = CUBAN_PROVINCE_MAP_CENTERS[province]
  return center ? [center.lng, center.lat] : null
}
