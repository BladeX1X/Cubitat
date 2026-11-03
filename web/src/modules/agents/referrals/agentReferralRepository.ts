import { supabase } from '../../../shared/lib/supabaseClient'

const AGENT_REFERRAL_CODE_PATTERN = /^AG-[0-9A-F]{8}$/i

/** Ensures the authenticated, verified agent has one stable active referral code. */
export async function ensureAgentReferralCode(): Promise<string> {
  const { data, error } = await supabase.rpc('ensure_agent_referral_link')
  if (error) throw new Error(`agent_referral_link_load_failed:${error.code || 'RPC_ERROR'}`)
  if (typeof data !== 'string') throw new Error(`agent_referral_link_load_failed:${data == null ? 'EMPTY_RESPONSE' : 'INVALID_TYPE'}`)
  if (!AGENT_REFERRAL_CODE_PATTERN.test(data.trim())) throw new Error('agent_referral_link_load_failed:INVALID_FORMAT')
  return data.trim().toUpperCase()
}

/** Builds the shareable landing URL for an agent's code. */
export function getAgentReferralLink(code: string, baseUrl?: string): string | null {
  const normalizedCode = code.trim().toUpperCase()
  if (!AGENT_REFERRAL_CODE_PATTERN.test(normalizedCode)) return null

  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  if (!origin) return null
  return `${origin.replace(/\/$/, '')}/?ref=${encodeURIComponent(normalizedCode)}`
}
