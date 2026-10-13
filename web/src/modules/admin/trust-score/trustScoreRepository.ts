import { supabase } from '../../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'

export type PropertyTrustScore = {
  score: number
  identity_verified: boolean
  document_verified: boolean
  published: boolean
  contact_present: boolean
  internal_indicator: string
}

export async function fetchPropertyTrustScore(propertyId: string): Promise<PropertyTrustScore | null> {
  const { data, error } = await supabase.rpc('get_property_trust_score', { p_property_id: propertyId })
  if (error) {
    logSafeEvent({ module: 'admin', action: 'fetch_trust_score', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error('No se pudo calcular el indicador de confianza.')
  }
  const row = Array.isArray(data) ? data[0] : data
  return (row as PropertyTrustScore | null) ?? null
}
