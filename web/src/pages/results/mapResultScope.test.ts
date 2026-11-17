import { describe, expect, it } from 'vitest'
import {
  EMPTY_MAP_RESULT_SCOPE,
  selectMapResultGroup,
  updateMapViewportResults,
} from './mapResultScope'

describe('map result scope', () => {
  it('keeps the selected cluster when zooming changes the map viewport', () => {
    const selected = selectMapResultGroup(['property-1', 'property-2', 'property-3'])

    expect(updateMapViewportResults(selected, ['many-other-properties'])).toEqual({
      propertyIds: ['property-1', 'property-2', 'property-3'],
      source: 'selection',
    })
  })

  it('updates results to the visible map area when there is no selected group', () => {
    expect(updateMapViewportResults(EMPTY_MAP_RESULT_SCOPE, ['property-4'])).toEqual({
      propertyIds: ['property-4'],
      source: 'viewport',
    })
  })
})
