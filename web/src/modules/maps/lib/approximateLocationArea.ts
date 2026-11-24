const EARTH_RADIUS_METERS = 6_371_000
const DEFAULT_SEGMENTS = 64

// The public location area is 1 km across (500 m from center to edge).
export const APPROXIMATE_PROPERTY_AREA_RADIUS_METERS = 500

type LinearRing = [number, number][]

export interface ApproximateLocationArea {
  type: 'Feature'
  geometry: {
    type: 'Polygon'
    coordinates: [LinearRing]
  }
  properties: {
    radiusMeters: number
  }
}

export function createApproximateLocationArea(
  center: [number, number],
  radiusMeters = APPROXIMATE_PROPERTY_AREA_RADIUS_METERS,
  segments = DEFAULT_SEGMENTS,
): ApproximateLocationArea {
  const [longitude, latitude] = center
  const latitudeRadians = degreesToRadians(latitude)
  const longitudeRadians = degreesToRadians(longitude)
  const angularDistance = radiusMeters / EARTH_RADIUS_METERS
  const safeSegments = Math.max(12, Math.round(segments))

  const ring: LinearRing = []

  for (let index = 0; index <= safeSegments; index += 1) {
    const bearing = (index / safeSegments) * Math.PI * 2
    const pointLatitude = Math.asin(
      Math.sin(latitudeRadians) * Math.cos(angularDistance) +
        Math.cos(latitudeRadians) * Math.sin(angularDistance) * Math.cos(bearing),
    )
    const pointLongitude =
      longitudeRadians +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitudeRadians),
        Math.cos(angularDistance) - Math.sin(latitudeRadians) * Math.sin(pointLatitude),
      )

    ring.push([normalizeLongitude(radiansToDegrees(pointLongitude)), radiansToDegrees(pointLatitude)])
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
    properties: {
      radiusMeters,
    },
  }
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
