import { supabase } from '../../../shared/lib/supabaseClient'

const VISITOR_KEY_PREFIX = 'cubitat_agent_referral_visitor:'
const VISIT_RECORDED_PREFIX = 'cubitat_agent_referral_visit_recorded:'

function getVisitorKey(code: string): string | null {
  try {
    const key = `${VISITOR_KEY_PREFIX}${code}`
    const existing = sessionStorage.getItem(key)
    if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existing)) return existing
    const visitorKey = crypto.randomUUID()
    sessionStorage.setItem(key, visitorKey)
    return visitorKey
  } catch {
    return null
  }
}

/** Records at most one unique referral landing per visitor browser session. */
export async function recordAgentReferralVisit(code: string): Promise<void> {
  const normalizedCode = code.trim().toUpperCase()
  const visitorKey = getVisitorKey(normalizedCode)
  if (!visitorKey) return
  const recordedKey = `${VISIT_RECORDED_PREFIX}${normalizedCode}`
  try {
    if (sessionStorage.getItem(recordedKey) === '1') return
    const { error } = await supabase.rpc('record_agent_referral_visit', {
      p_code: normalizedCode,
      p_visitor_key: visitorKey,
    })
    if (!error) sessionStorage.setItem(recordedKey, '1')
  } catch {
    // Tracking is best effort; it must never block browsing.
  }
}

export async function loadAgentReferralVisitCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_agent_referral_visit_count')
  if (error || typeof data !== 'number' || !Number.isSafeInteger(data) || data < 0) {
    throw new Error('agent_referral_visit_count_load_failed')
  }
  return data
}
