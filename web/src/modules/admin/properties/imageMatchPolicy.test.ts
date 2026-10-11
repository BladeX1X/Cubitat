import { describe, expect, it } from 'vitest'
import { getImageMatchLabel, getImageMatchStrength } from './imageMatchPolicy'

describe('image match review policy', () => {
  it.each([
    [0, 'exact-hash', 'hash idéntico'],
    [1, 'high-similarity', 'similitud alta'],
    [4, 'high-similarity', 'similitud alta'],
    [5, 'partial-match', 'coincidencia parcial'],
    [8, 'partial-match', 'coincidencia parcial'],
  ] as const)('classifies distance %i for manual review', (distance, strength, label) => {
    expect(getImageMatchStrength(distance)).toBe(strength)
    expect(getImageMatchLabel(distance)).toBe(label)
  })

  it.each([-1, 9, 1.5, Number.NaN])('rejects out-of-range distance %s', (distance) => {
    expect(getImageMatchStrength(distance)).toBe('out-of-range')
  })
})
