import { describe, expect, it } from 'vitest'
import type { Property } from '../../properties/types'
import {
  createPropertySourceData,
  getSelectedMapFeatures,
  groupMapFeaturesByScreenCell,
} from './propertySourceData'

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

  it('marks every property in a selected nine-result cluster so child clusters of four and five stay highlighted', () => {
    const properties = Array.from({ length: 9 }, (_, index) => ({
      ...baseProperty,
      id: `property-${index + 1}`,
    }))
    const selectedIds = properties.map((property) => property.id)
    const source = createPropertySourceData(properties, undefined, selectedIds)
    const selectedCount = (features: typeof source.features) =>
      features.filter((feature) => feature.properties?.isSelected).length

    expect(selectedCount(source.features)).toBe(9)
    expect(selectedCount(source.features.slice(0, 4))).toBe(4)
    expect(selectedCount(source.features.slice(4))).toBe(5)
  })

  it('keeps every selected result highlighted when the map regroups into 4 and 5 after zoom', () => {
    const properties = Array.from({ length: 14 }, (_, index) => ({
      ...baseProperty,
      id: `property-${index + 1}`,
    }))
    const selectedIds = properties.slice(0, 9).map((property) => property.id)
    const source = createPropertySourceData(properties, undefined, selectedIds)
    const selectedFeatures = getSelectedMapFeatures(source.features)
    const coordinates = new Map(selectedFeatures.map((feature, index) => [
      feature.properties?.id,
      index < 4 ? [20 + index, 20] as const : [150 + index, 20] as const,
    ]))
    const groups = groupMapFeaturesByScreenCell(
      selectedFeatures,
      (feature) => coordinates.get(feature.properties?.id) ?? [0, 0],
    )

    expect(selectedFeatures).toHaveLength(9)
    expect(selectedFeatures.map((feature) => feature.properties?.id)).toEqual(selectedIds)
    const groupedFeatures = groups.flatMap((group) => group.features)
    expect(groups.map((group) => group.features.length)).toEqual([4, 5])
    expect(groupedFeatures).toHaveLength(9)
    expect(groupedFeatures.every((feature) => feature.properties?.isSelected)).toBe(true)
  })
})
