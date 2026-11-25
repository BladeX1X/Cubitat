import { describe, expect, it } from 'vitest'
import { createCatalogListingSourceData } from './catalogListingSourceData'

describe('createCatalogListingSourceData', () => {
  it('plots a listing at its privacy-rounded public coordinates', () => {
    const source = createCatalogListingSourceData([{
      id: 'service-1', title: 'Fontanero', location: 'La Habana',
      coordinates: { latitude: 23.1136, longitude: -82.3666 }, label: 'Servicio',
    }])
    expect(source.features[0]?.geometry.coordinates).toEqual([-82.36, 23.12])
  })

  it('does not plot records without valid public coordinates', () => {
    const source = createCatalogListingSourceData([{
      id: 'material-1', title: 'Cemento', location: 'Holguín',
      coordinates: null, label: '12 USD',
    }])
    expect(source.features).toHaveLength(0)
  })

  it('preserves selected listing ids in feature properties', () => {
    const source = createCatalogListingSourceData([{
      id: 'material-1', title: 'Cemento', location: 'La Habana',
      coordinates: { latitude: 23.1, longitude: -82.3 }, label: '12 USD',
    }], undefined, ['material-1'])
    expect(source.features[0]?.properties?.isSelected).toBe(true)
  })
})
