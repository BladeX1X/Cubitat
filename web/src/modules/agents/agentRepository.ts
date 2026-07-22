import { supabase } from '../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'
import type { AgentProfile } from './types'
import type { Property } from '../properties/types'

export async function fetchAgentProfile(agentId: string): Promise<AgentProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, agency_name, agency_logo, bio, license_number, verification_status, created_at')
      .eq('id', agentId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      full_name: data.full_name || 'Agente Inmobiliario',
      phone: data.phone,
      agency_name: data.agency_name,
      agency_logo: data.agency_logo,
      bio: data.bio,
      license_number: data.license_number,
      verification_status: data.verification_status || 'unverified',
      created_at: data.created_at,
    }
  } catch (err) {
    logSafeEvent({
      module: 'agents',
      action: 'fetch_agent_profile_exception',
      level: 'error',
      code: sanitizeErrorReason(err),
    })
    return null
  }
}

export async function fetchAgentProperties(agentId: string): Promise<Property[]> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', agentId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error || !data) {
      return []
    }

    return data as Property[]
  } catch (err) {
    logSafeEvent({
      module: 'agents',
      action: 'fetch_agent_properties_exception',
      level: 'warn',
      code: sanitizeErrorReason(err),
    })
    return []
  }
}
