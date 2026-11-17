import { describe, expect, it } from 'vitest'
import type { Property } from '../types'
import type { SearchFilters } from '../../search/types'
import { filterProperties } from './filterProperties'

function listing(id: string, currency: Property['priceCurrency']): Property {
  return {
    id,
    title: id,
    location: 'La Habana',
    description: '',
    zoneId: 'habana',
    operation: 'venta',
    propertyType: 'casa',
    priceUsd: 50000,
    priceCurrency: currency,
    bedrooms: 2,
    bathrooms: 1,
    parking: 0,
    areaM2: 80,
    amenities: [],
    status: 'published',
    coverTone: '',
    coverImage: '',
    mapPoint: { x: 0, y: 0 },
    coordinates: { latitude: 0, longitude: 0 },
  }
}

describe('filterProperties currency handling', () => {
  it('does not compare CUP/MLC amounts against the catalog USD ranges', () => {
    const filters: SearchFilters = {
      query: '', operations: [], propertyType: 'all', zoneId: 'all', priceRange: '0-60000',
    }

    expect(filterProperties([
      listing('usd', 'USD'), listing('cup', 'CUP'), listing('mlc', 'MLC'),
    ], filters).map(({ id }) => id)).toEqual(['usd'])
  })

  it('keeps all currencies visible when no price range is selected', () => {
    const filters: SearchFilters = { query: '', operations: [], propertyType: 'all', zoneId: 'all' }

    expect(filterProperties([
      listing('usd', 'USD'), listing('cup', 'CUP'), listing('mlc', 'MLC'),
    ], filters)).toHaveLength(3)
  })
})
