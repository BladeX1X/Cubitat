import { describe, expect, it } from 'vitest'
import { buildAmenities, getAmenitySelections } from './amenities'

describe('publication amenities', () => {
  it('hydrates known selections from legacy amenities when features are missing', () => {
    expect(getAmenitySelections({}, ['Piscina', 'Patio', 'Garaje'])).toMatchObject({
      hasPool: true,
      hasPatio: true,
      hasPortal: false,
    })
  })

  it('preserves unmapped amenities while applying the current checkbox selections', () => {
    const amenities = buildAmenities(
      ['Garaje', 'Piscina', 'Agua de la calle'],
      {
        hasCistern: false,
        hasStreetGas: false,
        has220v: false,
        hasAc: false,
        isFurnished: false,
        hasLandline: false,
        hasTerrace: false,
        hasPatio: true,
        hasPool: false,
        hasPortal: true,
      },
    )

    expect(amenities).toEqual(['Garaje', 'Agua de la calle', 'Patio', 'Portal'])
  })
})
