import { describe, expect, it } from 'vitest'
import { shouldFitInitialBounds } from './mapCamera'

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
