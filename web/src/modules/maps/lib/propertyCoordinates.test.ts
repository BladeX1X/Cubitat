import { describe, expect, it } from 'vitest'
import { approximatePropertyCoordinates, normalizePropertyCoordinates } from './propertyCoordinates'

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

describe('approximatePropertyCoordinates', () => {
  it('moves public coordinates to a 0.02 degree privacy grid', () => {
    expect(
      approximatePropertyCoordinates({ latitude: 23.1136, longitude: -82.3666 }),
    ).toEqual({ latitude: 23.12, longitude: -82.36 })
  })

  it('normalizes legacy coordinates before approximating them', () => {
    expect(approximatePropertyCoordinates({ lat: '23.1136', lng: '-82.3666' })).toEqual({
      latitude: 23.12,
      longitude: -82.36,
    })
  })

  it('rejects invalid coordinates instead of exposing them', () => {
    expect(approximatePropertyCoordinates({ latitude: 91, longitude: -82.3666 })).toBeNull()
  })
})
