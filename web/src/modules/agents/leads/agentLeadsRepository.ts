import { supabase } from '../../../shared/lib/supabaseClient'
import type { AgentGrowthLead, AgentLeadEvent, AgentLeadStatus, NewAgentLead } from './types'

export type AdminAgentLead = AgentGrowthLead & { agent_id: string }

export async function loadAgentLeads(): Promise<{ leads: AgentGrowthLead[]; events: AgentLeadEvent[] }> {
  const [leadsResult, eventsResult] = await Promise.all([
    supabase.from('agent_leads')
      .select('id, lead_type, contact_name, contact_phone, property_title, location, client_interest, notes, status, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('agent_lead_events')
      .select('id, lead_id, from_status, to_status, actor_id, note, created_at')
      .order('created_at', { ascending: false }),
  ])
  if (leadsResult.error || eventsResult.error) throw new Error('agent_leads_load_failed')
  return {
    leads: (leadsResult.data ?? []) as AgentGrowthLead[],
    events: (eventsResult.data ?? []) as AgentLeadEvent[],
  }
}

export async function loadAdminAgentLeads(): Promise<{ leads: AdminAgentLead[]; events: AgentLeadEvent[] }> {
  const [leadsResult, eventsResult] = await Promise.all([
    supabase.from('agent_leads')
      .select('id, agent_id, lead_type, contact_name, contact_phone, property_title, location, client_interest, notes, status, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('agent_lead_events')
      .select('id, lead_id, from_status, to_status, actor_id, note, created_at')
      .order('created_at', { ascending: false }),
  ])
  if (leadsResult.error || eventsResult.error) throw new Error('agent_leads_admin_load_failed')
  return {
    leads: (leadsResult.data ?? []) as AdminAgentLead[],
    events: (eventsResult.data ?? []) as AgentLeadEvent[],
  }
}

export async function createAgentLead(input: NewAgentLead): Promise<void> {
  const { error } = await supabase.rpc('create_agent_lead', {
    p_lead_type: input.leadType,
    p_contact_name: input.contactName,
    p_contact_phone: input.contactPhone,
    p_property_title: input.propertyTitle || null,
    p_location: input.location || null,
    p_client_interest: input.clientInterest || null,
    p_notes: input.notes || null,
    p_consent_confirmed: input.consentConfirmed,
  })
  if (error) {
    throw new Error(error.code === '54000' ? 'agent_lead_limit_reached' : 'agent_lead_create_failed')
  }
}

export async function updateAgentLeadStatus(leadId: string, status: AgentLeadStatus, note?: string): Promise<void> {
  const { error } = await supabase.rpc('update_agent_lead_status', {
    p_lead_id: leadId,
    p_status: status,
    p_note: note?.trim() || null,
  })
  if (error) throw new Error('agent_lead_status_update_failed')
}
