import type { Property } from '../../properties/types'

type PropertyCoordinates = Property['coordinates']
const PUBLIC_COORDINATE_GRID_DEGREES = 0.02

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

export function approximatePropertyCoordinates(value: unknown): PropertyCoordinates | null {
  const coordinates = normalizePropertyCoordinates(value)
  if (!coordinates) return null

  const snapToPrivacyGrid = (coordinate: number) => Number((
    Math.round(coordinate / PUBLIC_COORDINATE_GRID_DEGREES) * PUBLIC_COORDINATE_GRID_DEGREES
  ).toFixed(2))

  return {
    latitude: snapToPrivacyGrid(coordinates.latitude),
    longitude: snapToPrivacyGrid(coordinates.longitude),
  }
}
