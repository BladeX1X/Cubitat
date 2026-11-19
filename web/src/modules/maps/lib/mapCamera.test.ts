import { describe, expect, it } from 'vitest'
import {
  getSelectionPadding,
  isPointInsideSelectionViewport,
  shouldFitInitialBounds,
  shouldRecenterSelection,
} from './mapCamera'

describe('shouldFitInitialBounds', () => {
  it('fits results once when initial coordinates are available', () => {
    expect(shouldFitInitialBounds(false, false)).toBe(true)
  })

  it('waits when initial results have no coordinates', () => {
    expect(shouldFitInitialBounds(false, true)).toBe(false)
  })

  it('does not refit after filters replace the results', () => {
    expect(shouldFitInitialBounds(true, false)).toBe(false)
  })
})

describe('shouldRecenterSelection', () => {
  it('reframes selected results when zoom moves any selected coordinate outside the viewport', () => {
    const visibleCoordinates = new Set(['-82.3,23.1', '-82.2,23.2'])
    const contains = ([longitude, latitude]: [number, number]) =>
      visibleCoordinates.has(`${longitude},${latitude}`)

    expect(shouldRecenterSelection([[-82.3, 23.1], [-82.2, 23.2]], contains)).toBe(false)
    expect(shouldRecenterSelection([[-82.3, 23.1], [-80.2, 22.4]], contains)).toBe(true)
    expect(shouldRecenterSelection([], contains)).toBe(false)
  })
})

describe('selection camera padding', () => {
  it('reserves the space covered by mobile search and selected-result carousel overlays', () => {
    expect(getSelectionPadding({ top: 76, bottom: 378 })).toEqual({
      top: 112,
      right: 56,
      bottom: 414,
      left: 56,
    })
  })

  it('keeps selected markers away from both the viewport edge and overlays', () => {
    const padding = getSelectionPadding({ top: 76, bottom: 378 })

    expect(isPointInsideSelectionViewport(
      { x: 195, y: 250 },
      { width: 390, height: 844 },
      padding,
    )).toBe(true)
    expect(isPointInsideSelectionViewport(
      { x: 195, y: 100 },
      { width: 390, height: 844 },
      padding,
    )).toBe(false)
    expect(isPointInsideSelectionViewport(
      { x: 195, y: 440 },
      { width: 390, height: 844 },
      padding,
    )).toBe(false)
  })
})
