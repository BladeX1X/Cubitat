import type { ComparableSource } from './comparableSource'
import type { ValuationEstimate, ValuationInput } from './types'

export const MIN_VALUATION_COMPARABLES = 5

export async function estimatePropertyValue(
  source: ComparableSource,
  input: ValuationInput,
): Promise<ValuationEstimate | null> {
  const comparables = await source.findComparables(input)
  if (comparables.length < MIN_VALUATION_COMPARABLES) return null
  const sorted = comparables
    .map((item) => item.priceUsd / item.areaM2)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((left, right) => left - right)
  if (sorted.length < MIN_VALUATION_COMPARABLES) return null
  const middle = Math.floor(sorted.length / 2)
  const medianPricePerM2 = sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!
  return { medianUsd: medianPricePerM2 * input.areaM2, medianPricePerM2, comparables, estimatedAt: new Date().toISOString() }
}
