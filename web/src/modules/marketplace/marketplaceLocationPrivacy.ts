import {
  APPROXIMATE_PROPERTY_AREA_RADIUS_METERS,
  createApproximateLocationArea,
} from '../maps/lib/approximateLocationArea'

const MIN_CIRCLE_OFFSET_METERS = 120
const MAX_CIRCLE_OFFSET_METERS = 240
const EARTH_RADIUS_METERS = 6_371_000

/** Creates a stable, listing-specific offset so the public marker is not always the circle's center. */
export function createMarketplaceApproximateArea(
  marker: [number, number],
  listingId: string,
) {
  const hash = hashListingId(listingId)
  const bearing = (hash / 0x1_0000_0000) * Math.PI * 2
  const distanceFraction = mixHash(hash) / 0x1_0000_0000
  const offsetMeters = MIN_CIRCLE_OFFSET_METERS + distanceFraction * (MAX_CIRCLE_OFFSET_METERS - MIN_CIRCLE_OFFSET_METERS)

  return createApproximateLocationArea(destinationPoint(marker, bearing, offsetMeters), APPROXIMATE_PROPERTY_AREA_RADIUS_METERS)
}

function hashListingId(value: string) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function mixHash(value: number) {
  let mixed = value + 0x9e3779b9
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x21f0aaad)
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x735a2d97)
  return (mixed ^ (mixed >>> 15)) >>> 0
}

function destinationPoint([longitude, latitude]: [number, number], bearing: number, distanceMeters: number): [number, number] {
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS
  const latitudeRadians = degreesToRadians(latitude)
  const longitudeRadians = degreesToRadians(longitude)
  const destinationLatitude = Math.asin(
    Math.sin(latitudeRadians) * Math.cos(angularDistance) +
      Math.cos(latitudeRadians) * Math.sin(angularDistance) * Math.cos(bearing),
  )
  const destinationLongitude = longitudeRadians + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitudeRadians),
    Math.cos(angularDistance) - Math.sin(latitudeRadians) * Math.sin(destinationLatitude),
  )

  return [normalizeLongitude(radiansToDegrees(destinationLongitude)), radiansToDegrees(destinationLatitude)]
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180
}

function radiansToDegrees(value: number) {
  return (value * 180) / Math.PI
}

function normalizeLongitude(value: number) {
  return ((((value + 180) % 360) + 360) % 360) - 180
}
