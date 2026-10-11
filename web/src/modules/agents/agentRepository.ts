import { supabase } from '../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'
import type { AgentProfile, AgentPropertySummary } from './types'

type PublicAgentProfileRow = Omit<AgentProfile, 'active_properties_count' | 'reports_count'> & {
  active_properties_count: number | string
  reports_count: number | string
}

type AgentPropertyRow = {
  id: string
  title: string
  location: string
  price_usd: number | string | null
  cover_image: string | null
  status: 'published'
}

type VerifiedAgentRow = {
  id: string
}

export async function fetchVerifiedAgentIds(): Promise<Set<string>> {
  const { data, error } = await supabase.rpc('get_verified_agent_ids')
  if (error) {
    logSafeEvent({
      module: 'agents',
      action: 'fetch_verified_agent_ids',
      level: 'warn',
      code: sanitizeErrorReason(error),
    })
    throw new Error('VERIFIED_AGENT_IDS_LOAD_FAILED')
  }

  return new Set(((data ?? []) as VerifiedAgentRow[]).map(({ id }) => id))
}

export async function fetchVerifiedSellerIds(): Promise<Set<string>> {
  const { data, error } = await supabase.rpc('get_verified_seller_ids')
  if (error) {
    logSafeEvent({
      module: 'agents',
      action: 'fetch_verified_seller_ids',
      level: 'warn',
      code: sanitizeErrorReason(error),
    })
    throw new Error('VERIFIED_SELLER_IDS_LOAD_FAILED')
  }

  return new Set(((data ?? []) as VerifiedAgentRow[]).map(({ id }) => id))
}

export async function fetchAgentProfile(agentId: string): Promise<AgentProfile | null> {
  try {
    const { data, error } = await supabase.rpc('get_public_agent_profile', {
      p_agent_id: agentId,
    })

    if (error) {
      throw new Error('AGENT_PROFILE_RPC_FAILED')
    }

    const row = (Array.isArray(data) ? data[0] : data) as PublicAgentProfileRow | null
    if (!row) {
      return null
    }

    return {
      ...row,
      full_name: row.full_name || 'Anunciante Cubitat',
      verification_status: row.verification_status || 'unverified',
      active_properties_count: Number(row.active_properties_count) || 0,
      reports_count: Number(row.reports_count) || 0,
    }
  } catch (err) {
    logSafeEvent({
      module: 'agents',
      action: 'fetch_agent_profile_exception',
      level: 'error',
      code: sanitizeErrorReason(err),
    })
    throw new Error('AGENT_PROFILE_LOAD_FAILED')
  }
}

export async function fetchAgentProperties(agentId: string): Promise<AgentPropertySummary[]> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, location, price_usd, cover_image, status')
      .eq('user_id', agentId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error('AGENT_PROPERTIES_QUERY_FAILED')
    }
    if (!data) {
      return []
    }

    return (data as AgentPropertyRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      location: row.location,
      priceUsd: row.price_usd == null ? undefined : Number(row.price_usd),
      coverImage: row.cover_image ?? '',
      status: 'published',
    }))
  } catch (err) {
    logSafeEvent({
      module: 'agents',
      action: 'fetch_agent_properties_exception',
      level: 'warn',
      code: sanitizeErrorReason(err),
    })
    throw new Error('AGENT_PROPERTIES_LOAD_FAILED')
  }
}
