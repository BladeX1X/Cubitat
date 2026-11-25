import { describe, expect, it } from 'vitest'
import { EMPTY_CATALOG_MAP_SCOPE, getSelectedCatalogMapListingIds, selectCatalogMapGroup, updateCatalogMapViewport } from './catalogMapScope'

describe('catalogMapScope', () => {
  it('shows results inside the current map viewport', () => {
    const viewport = updateCatalogMapViewport(EMPTY_CATALOG_MAP_SCOPE, ['service-1'])
    expect(viewport).toEqual({ listingIds: ['service-1'], source: 'viewport' })
    expect(getSelectedCatalogMapListingIds(viewport)).toBeUndefined()
  })

  it('keeps a selected point group visible until the map source is reset', () => {
    const selected = selectCatalogMapGroup(['material-1', 'material-2'])
    expect(getSelectedCatalogMapListingIds(selected)).toEqual(['material-1', 'material-2'])
    expect(updateCatalogMapViewport(selected, ['material-1'])).toBe(selected)
  })
})
