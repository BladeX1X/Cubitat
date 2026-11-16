import { describe, expect, it } from 'vitest'
import type { Property } from '../../properties/types'
import { createPropertySourceData } from './propertySourceData'

const baseProperty: Property = {
  id: 'valid-property',
  title: 'Casa válida',
  location: 'La Habana',
  description: 'Propiedad de prueba',
  zoneId: 'habana',
  operation: 'venta',
  propertyType: 'casa',
  priceUsd: 50_000,
  bedrooms: 2,
  bathrooms: 1,
  parking: 0,
  areaM2: 80,
  amenities: [],
  status: 'published',
  coverTone: '#fff',
  coverImage: '',
  mapPoint: { x: 0, y: 0 },
  coordinates: { latitude: 23.135, longitude: -82.383 },
}

describe('createPropertySourceData', () => {
  it('omits properties with invalid coordinates instead of crashing MapLibre', () => {
    const invalidProperty = {
      ...baseProperty,
      id: 'invalid-property',
      coordinates: { latitude: Number.NaN, longitude: Number.NaN },
    }

    const source = createPropertySourceData([baseProperty, invalidProperty])

    expect(source.features).toHaveLength(1)
    expect(source.features[0]?.properties?.id).toBe('valid-property')
    expect(source.features[0]?.geometry.coordinates).toEqual([-82.38, 23.14])
  })

  it('positions pins from the declared locality when stored coordinates point to another city', () => {
    const misplacedProperty = {
      ...baseProperty,
      id: 'misplaced-property',
      location: 'Santiago de Cuba, Santiago de Cuba',
      coordinates: { latitude: 23.12, longitude: -82.36 },
    }

    const source = createPropertySourceData([misplacedProperty])
    expect(source.features[0]?.geometry.coordinates).toEqual([-75.82, 20.02])
  })
})
