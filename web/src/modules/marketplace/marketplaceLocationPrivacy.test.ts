import { describe, expect, it } from 'vitest'
import { createMarketplaceApproximateArea } from './marketplaceLocationPrivacy'

const EARTH_RADIUS_METERS = 6_371_000

describe('createMarketplaceApproximateArea', () => {
  it('keeps the same offset for the same listing across views', () => {
    const marker: [number, number] = [-82.36, 23.12]

    expect(createMarketplaceApproximateArea(marker, 'listing-a'))
      .toEqual(createMarketplaceApproximateArea(marker, 'listing-a'))
  })

  it('moves the 1 km circle away from the marker while keeping the marker inside it', () => {
    const marker: [number, number] = [-82.36, 23.12]
    const area = createMarketplaceApproximateArea(marker, 'listing-a')
    const ring = area.geometry.coordinates[0]
    const circleCenter = polygonCenter(ring)
    const distance = distanceMeters(marker, circleCenter)

    expect(area.properties.radiusMeters).toBe(500)
    expect(distance).toBeGreaterThanOrEqual(120)
    expect(distance).toBeLessThanOrEqual(240)
    expect(distance).toBeLessThan(500)
  })

  it('uses listing identity to vary the offset', () => {
    const marker: [number, number] = [-82.36, 23.12]
    const first = polygonCenter(createMarketplaceApproximateArea(marker, 'listing-a').geometry.coordinates[0])
    const second = polygonCenter(createMarketplaceApproximateArea(marker, 'listing-b').geometry.coordinates[0])

    expect(second).not.toEqual(first)
  })
})

function polygonCenter(ring: [number, number][]): [number, number] {
  const openRing = ring.slice(0, -1)
  return [
    openRing.reduce((sum, [longitude]) => sum + longitude, 0) / openRing.length,
    openRing.reduce((sum, [, latitude]) => sum + latitude, 0) / openRing.length,
  ]
}

function distanceMeters([fromLongitude, fromLatitude]: [number, number], [toLongitude, toLatitude]: [number, number]) {
  const toRadians = (value: number) => (value * Math.PI) / 180
  const deltaLatitude = toRadians(toLatitude - fromLatitude)
  const deltaLongitude = toRadians(toLongitude - fromLongitude)
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(fromLatitude)) * Math.cos(toRadians(toLatitude)) * Math.sin(deltaLongitude / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}
