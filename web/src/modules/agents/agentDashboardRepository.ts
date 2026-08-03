import { supabase } from '../../shared/lib/supabaseClient'
import type { PropertyStatus } from '../properties/propertyStatus'

export interface AgentDashboardProperty {
  id: string
  title: string
  location: string
  price_usd: number
  cover_image: string | null
  status: PropertyStatus
  created_at: string
  user_id: string
  view_count?: number
  phone_clicks_count?: number
  whatsapp_clicks_count?: number
}

export interface AgentDashboardData {
  role: string
  isVerifiedAgent: boolean
  properties: AgentDashboardProperty[]
}

export async function loadAgentDashboard(ownerId: string): Promise<AgentDashboardData> {
  const [profileResult, propertiesResult] = await Promise.all([
    supabase.from('profiles').select('role, verification_status').eq('id', ownerId).maybeSingle(),
    supabase
      .from('properties')
      .select('id, title, location, price_usd, cover_image, status, created_at, user_id, view_count, phone_clicks_count, whatsapp_clicks_count')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false }),
  ])
  if (profileResult.error) throw new Error('agent_profile_load_failed')
  if (propertiesResult.error) throw new Error('agent_dashboard_load_failed')

  const properties = (propertiesResult.data ?? []) as AgentDashboardProperty[]

  return {
    role: profileResult.data?.role ?? 'buyer',
    isVerifiedAgent:
      profileResult.data?.role === 'agent' && profileResult.data?.verification_status === 'verified',
    properties,
  }
}

export async function setOwnerPropertyVisibility(
  propertyId: string,
  ownerId: string,
  currentStatus: PropertyStatus,
): Promise<PropertyStatus> {
  if (!ownerId) throw new Error('property_visibility_session_required')
  if (currentStatus !== 'published' && currentStatus !== 'owner_hidden') {
    throw new Error('property_visibility_transition_not_allowed')
  }
  const nextStatus: PropertyStatus = currentStatus === 'published' ? 'owner_hidden' : 'published'
  const rpcName = currentStatus === 'published' ? 'hide_own_property' : 'restore_own_property'
  const { error } = await supabase.rpc(rpcName, { p_property_id: propertyId })
  if (error) throw new Error('property_visibility_update_failed')
  return nextStatus
}
