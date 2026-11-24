import { describe, expect, it } from 'vitest'
import { getCubanProvinceMapCenter } from './cubanProvinceMapCenters'

describe('getCubanProvinceMapCenter', () => {
  it('returns an approximate map center for Cuban provinces', () => {
    expect(getCubanProvinceMapCenter('Granma')).toEqual([-76.6444, 20.3847])
    expect(getCubanProvinceMapCenter('Pinar del Río')).toEqual([-83.6903, 22.4164])
  })

  it('returns null when the listing has no known province', () => {
    expect(getCubanProvinceMapCenter('Unknown')).toBeNull()
  })
})
