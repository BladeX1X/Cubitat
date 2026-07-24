import { describe, expect, it } from 'vitest'
import { isPhaseTwoEnabled } from './features'

describe('Phase 2 environment boundary', () => {
  it('is enabled only in development', () => {
    expect(isPhaseTwoEnabled(true)).toBe(true)
    expect(isPhaseTwoEnabled(false)).toBe(false)
  })
})
