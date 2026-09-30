import { describe, expect, it } from 'vitest'
import {
  APPROXIMATE_PROPERTY_AREA_RADIUS_METERS,
  createApproximateLocationArea,
} from './approximateLocationArea'

const EARTH_RADIUS_METERS = 6_371_000

describe('createApproximateLocationArea', () => {
  it('creates a closed polygon around the approximate coordinate', () => {
    const area = createApproximateLocationArea([-82.36, 23.12], 2_000, 16)
    const ring = area.geometry.coordinates[0]

    expect(area.geometry.type).toBe('Polygon')
    expect(area.properties.radiusMeters).toBe(2_000)
    expect(ring).toHaveLength(17)
    expect(ring.at(0)).toEqual(ring.at(-1))
  })

  it('keeps the visible area tied to meters instead of screen pixels', () => {
    const center: [number, number] = [-82.36, 23.12]
    const area = createApproximateLocationArea(center)
    const ring = area.geometry.coordinates[0]

    for (const point of ring.slice(0, -1)) {
      expect(distanceMeters(center, point)).toBeCloseTo(APPROXIMATE_PROPERTY_AREA_RADIUS_METERS, -1)
    }
  })
})

function distanceMeters([fromLongitude, fromLatitude]: [number, number], [toLongitude, toLatitude]: [number, number]) {
  const fromLatitudeRadians = degreesToRadians(fromLatitude)
  const toLatitudeRadians = degreesToRadians(toLatitude)
  const deltaLatitude = degreesToRadians(toLatitude - fromLatitude)
  const deltaLongitude = degreesToRadians(toLongitude - fromLongitude)
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitudeRadians) *
      Math.cos(toLatitudeRadians) *
      Math.sin(deltaLongitude / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180
}
