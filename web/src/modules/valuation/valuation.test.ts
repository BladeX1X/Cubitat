import { describe, expect, it, vi } from 'vitest'
import { estimatePropertyValue, MIN_VALUATION_COMPARABLES } from './valuation'
import type { ComparableSource } from './comparableSource'

const row = (priceUsd: number, areaM2 = 100) => ({ id: `public-${priceUsd}-${areaM2}`, areaM2, priceUsd, publishedAt: '2026-11-01T00:00:00Z' })

describe('estimatePropertyValue', () => {
  it('does not return an estimate when there are fewer than five comparables', async () => {
    const source: ComparableSource = { findComparables: vi.fn().mockResolvedValue([row(100), row(200), row(300), row(400)]) }
    await expect(estimatePropertyValue(source, { propertyType: 'casa', operation: 'venta', location: 'La Habana', areaM2: 100 })).resolves.toBeNull()
    expect(MIN_VALUATION_COMPARABLES).toBe(5)
  })

  it('uses the median of returned public comparables', async () => {
    const source: ComparableSource = { findComparables: vi.fn().mockResolvedValue([row(100), row(500), row(300), row(200), row(400)]) }
    const estimate = await estimatePropertyValue(source, { propertyType: 'casa', operation: 'venta', location: 'La Habana', areaM2: 100 })
    expect(estimate?.medianUsd).toBe(300)
    expect(estimate?.medianPricePerM2).toBe(3)
    expect(estimate?.comparables).toHaveLength(5)
  })

  it('normalizes comparables with different sizes before projecting the submitted area', async () => {
    const source: ComparableSource = { findComparables: vi.fn().mockResolvedValue([row(1000, 100), row(3000, 100), row(1200, 100), row(4000, 200), row(2500, 100)]) }
    const estimate = await estimatePropertyValue(source, { propertyType: 'casa', operation: 'venta', location: 'La Habana', areaM2: 150 })
    expect(estimate?.medianPricePerM2).toBe(20)
    expect(estimate?.medianUsd).toBe(3000)
  })
})
