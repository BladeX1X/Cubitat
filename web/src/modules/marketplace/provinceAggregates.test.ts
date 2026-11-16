import { describe, expect, it } from 'vitest'
import { aggregateProvinceCounts, PROVINCE_MAP_CENTERS } from './provinceAggregates'

describe('aggregateProvinceCounts', () => {
  it('counts and sorts provinces while ignoring blank values', () => {
    expect(aggregateProvinceCounts([{ province: 'Holguín' }, { province: 'La Habana' }, { province: 'Holguín' }, { province: '  ' }]))
      .toEqual([{ province: 'Holguín', count: 2 }, { province: 'La Habana', count: 1 }])
  })

  it('has an approximate map center for every Cuban province', () => {
    expect(Object.keys(PROVINCE_MAP_CENTERS)).toHaveLength(16)
  })
})
