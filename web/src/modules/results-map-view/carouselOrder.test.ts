import { describe, expect, it } from 'vitest'
import { orderPropertiesByIds } from './carouselOrder'

describe('orderPropertiesByIds', () => {
  it('preserva el orden del cluster aunque difiera del listado general', () => {
    const properties = [
      { id: 'property-a', title: 'A' },
      { id: 'property-b', title: 'B' },
      { id: 'property-c', title: 'C' },
    ]

    expect(orderPropertiesByIds(properties, ['property-c', 'property-a'])).toEqual([
      properties[2],
      properties[0],
    ])
  })
})
