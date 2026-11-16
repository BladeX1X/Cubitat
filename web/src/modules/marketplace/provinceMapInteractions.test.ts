import { describe, expect, it } from 'vitest'
import { resolveProvinceMapTarget } from './provinceMapInteractions'

describe('resolveProvinceMapTarget', () => {
  it('expands a cluster when its number label is clicked', () => {
    expect(resolveProvinceMapTarget([{
      properties: { cluster: true, cluster_id: 42, point_count: 8 },
      geometry: { type: 'Point', coordinates: [-79.5, 21.8] },
    }])).toEqual({ kind: 'cluster', clusterId: 42, center: [-79.5, 21.8] })
  })

  it('selects a province when its count label is clicked', () => {
    expect(resolveProvinceMapTarget([{
      properties: { province: 'Holguín', count: 5 },
      geometry: { type: 'Point', coordinates: [-76.2, 20.9] },
    }])).toEqual({ kind: 'province', province: 'Holguín' })
  })

  it('ignores malformed and unrelated rendered features', () => {
    expect(resolveProvinceMapTarget([
      { properties: { cluster_id: '42' }, geometry: { type: 'Point', coordinates: [-79, 21] } },
      { properties: { province: '  ' } },
      { properties: { label: '8 resultados' } },
    ])).toBeNull()
  })

  it('prefers expanding an overlapping cluster over selecting a province', () => {
    expect(resolveProvinceMapTarget([
      { properties: { province: 'La Habana' } },
      { properties: { cluster_id: 7 }, geometry: { type: 'Point', coordinates: [-82.3, 23.1] } },
    ])).toEqual({ kind: 'cluster', clusterId: 7, center: [-82.3, 23.1] })
  })
})
