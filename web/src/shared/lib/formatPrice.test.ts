import { describe, expect, it } from 'vitest'
import { formatPrice } from './formatPrice'

describe('formatPrice', () => {
  it('formats CUP and MLC with explicit currency codes and does not convert the amount', () => {
    expect(formatPrice(125000, 'CUP')).toBe('CUP 125,000')
    expect(formatPrice(420, 'MLC')).toBe('MLC 420')
  })

  it('preserves USD as the default currency for existing properties', () => {
    expect(formatPrice(45000)).toContain('45,000')
    expect(formatPrice(45000)).not.toContain('CUP')
  })
})
