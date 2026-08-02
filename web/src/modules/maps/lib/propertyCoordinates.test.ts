import { describe, expect, it } from 'vitest'
import { normalizePropertyCoordinates } from './propertyCoordinates'

describe('normalizePropertyCoordinates', () => {
  it('keeps canonical latitude and longitude coordinates', () => {
    expect(
      normalizePropertyCoordinates({ latitude: 23.135, longitude: -82.383 }),
    ).toEqual({ latitude: 23.135, longitude: -82.383 })
  })

  it('normalizes legacy lat and lng coordinates', () => {
    expect(normalizePropertyCoordinates({ lat: 23.135, lng: -82.383 })).toEqual({
      latitude: 23.135,
      longitude: -82.383,
    })
  })

  it('normalizes numeric strings returned by external data sources', () => {
    expect(
      normalizePropertyCoordinates({ latitude: '23.135', longitude: '-82.383' }),
    ).toEqual({ latitude: 23.135, longitude: -82.383 })
  })

  it.each([
    null,
    {},
    { latitude: Number.NaN, longitude: -82.383 },
    { latitude: 91, longitude: -82.383 },
    { latitude: 23.135, longitude: -181 },
  ])('rejects invalid coordinates: %j', (coordinates) => {
    expect(normalizePropertyCoordinates(coordinates)).toBeNull()
  })
})
