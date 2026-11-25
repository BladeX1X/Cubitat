import { describe, expect, it } from 'vitest'
import { EMPTY_CATALOG_MAP_SCOPE, selectCatalogMapGroup, updateCatalogMapViewport } from './catalogMapScope'

describe('catalogMapScope', () => {
  it('shows results inside the current map viewport', () => {
    expect(updateCatalogMapViewport(EMPTY_CATALOG_MAP_SCOPE, ['service-1'])).toEqual({ listingIds: ['service-1'], source: 'viewport' })
  })

  it('keeps a selected point group visible until the map source is reset', () => {
    const selected = selectCatalogMapGroup(['material-1', 'material-2'])
    expect(updateCatalogMapViewport(selected, ['material-1'])).toBe(selected)
  })
})
