import type { Property } from '../../properties/types'

type PropertyCoordinates = Property['coordinates']
const PUBLIC_COORDINATE_GRID_DEGREES = 0.02
const LOCATION_COORDINATE_MISMATCH_KM = 45

const KNOWN_LOCALITY_CENTERS: Record<string, PropertyCoordinates> = {
  'santiago de cuba|santiago de cuba': { latitude: 20.0244, longitude: -75.8224 },
  'holguin|holguin': { latitude: 20.8874, longitude: -76.2617 },
  'matanzas|matanzas': { latitude: 23.0419, longitude: -81.5774 },
  'cardenas|matanzas': { latitude: 23.0422, longitude: -81.2025 },
}

function normalizedLocationPart(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function findDeclaredLocalityCenter(location: string | undefined): PropertyCoordinates | null {
  if (!location) return null

  const parts = location.split(',').map(normalizedLocationPart).filter(Boolean)
  if (parts.length === 0) return null

  const province = parts.at(-1)!
  const municipality = parts.length > 1 ? parts.at(-2)! : province
  return KNOWN_LOCALITY_CENTERS[`${municipality}|${province}`] ?? null
}

function distanceInKm(left: PropertyCoordinates, right: PropertyCoordinates): number {
  const toRadians = (degrees: number) => degrees * Math.PI / 180
  const latitudeDelta = toRadians(right.latitude - left.latitude)
  const longitudeDelta = toRadians(right.longitude - left.longitude)
  const leftLatitude = toRadians(left.latitude)
  const rightLatitude = toRadians(right.latitude)
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function normalizePropertyCoordinates(value: unknown): PropertyCoordinates | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const coordinates = value as Record<string, unknown>
  const latitude = toFiniteNumber(coordinates.latitude ?? coordinates.lat)
  const longitude = toFiniteNumber(coordinates.longitude ?? coordinates.lng)

  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null
  }

  return { latitude, longitude }
}

export function approximatePropertyCoordinates(
  value: unknown,
  declaredLocation?: string,
): PropertyCoordinates | null {
  const coordinates = normalizePropertyCoordinates(value)
  if (!coordinates) return null

  const localityCenter = findDeclaredLocalityCenter(declaredLocation)
  const pointToApproximate = localityCenter
    && distanceInKm(coordinates, localityCenter) > LOCATION_COORDINATE_MISMATCH_KM
    ? localityCenter
    : coordinates

  const snapToPrivacyGrid = (coordinate: number) => Number((
    Math.round(coordinate / PUBLIC_COORDINATE_GRID_DEGREES) * PUBLIC_COORDINATE_GRID_DEGREES
  ).toFixed(2))

  return {
    latitude: snapToPrivacyGrid(pointToApproximate.latitude),
    longitude: snapToPrivacyGrid(pointToApproximate.longitude),
  }
}
