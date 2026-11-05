import { supabase } from '../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'
import type { PropertyComparable, ValuationInput } from './types'

export interface ComparableSource {
  findComparables(input: ValuationInput): Promise<PropertyComparable[]>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const propertyComparableSource: ComparableSource = {
  async findComparables(input) {
    const { data, error } = await supabase.rpc('get_property_value_comparables', {
      p_property_type: input.propertyType,
      p_operation: input.operation,
      p_location: input.location.trim(),
      p_area_m2: input.areaM2,
    })
    if (error) {
      logSafeEvent({ module: 'valuation', action: 'load_comparables', level: 'warn', code: sanitizeErrorReason(error) })
      throw new Error('VALUATION_LOAD_FAILED')
    }
    if (!Array.isArray(data)) return []
    return data.flatMap((value) => {
      if (!isRecord(value) || typeof value.comparable_id !== 'string' || typeof value.published_at !== 'string') return []
      const areaM2 = Number(value.area_m2)
      const priceUsd = Number(value.price_usd)
      if (!Number.isFinite(areaM2) || areaM2 <= 0 || !Number.isFinite(priceUsd) || priceUsd <= 0) return []
      return [{ id: value.comparable_id, areaM2, priceUsd, publishedAt: value.published_at }]
    })
  },
}
