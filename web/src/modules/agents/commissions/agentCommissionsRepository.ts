import { supabase } from '../../../shared/lib/supabaseClient'
import type { AgentCommission, AgentCommissionEvent, AgentCommissionStatus, AgentCommissionStatusChange, NewAgentCommission } from './types'

export type AdminAgentCommission = AgentCommission & { agent_id: string; lead_id: string }

export async function loadAgentCommissions(): Promise<{ commissions: AgentCommission[]; events: AgentCommissionEvent[] }> {
  const [commissionsResult, eventsResult] = await Promise.all([
    supabase.from('agent_commissions')
      .select('id, operation_reference, eligible_amount, rate_percent, commission_amount, currency, status, created_at, paid_at')
      .order('created_at', { ascending: false }),
    supabase.from('agent_commission_events')
      .select('id, commission_id, action, previous_status, new_status, actor_id, note, created_at')
      .order('created_at', { ascending: false }),
  ])
  if (commissionsResult.error || eventsResult.error) throw new Error('agent_commissions_load_failed')
  return {
    commissions: (commissionsResult.data ?? []) as AgentCommission[],
    events: (eventsResult.data ?? []) as AgentCommissionEvent[],
  }
}

export async function loadAdminAgentCommissions(): Promise<{ commissions: AdminAgentCommission[]; events: AgentCommissionEvent[] }> {
  const [commissionsResult, eventsResult] = await Promise.all([
    supabase.from('agent_commissions')
      .select('id, lead_id, agent_id, operation_reference, eligible_amount, rate_percent, commission_amount, currency, status, created_at, paid_at')
      .order('created_at', { ascending: false }),
    supabase.from('agent_commission_events')
      .select('id, commission_id, action, previous_status, new_status, actor_id, note, created_at')
      .order('created_at', { ascending: false }),
  ])
  if (commissionsResult.error || eventsResult.error) throw new Error('agent_commissions_admin_load_failed')
  return {
    commissions: (commissionsResult.data ?? []) as AdminAgentCommission[],
    events: (eventsResult.data ?? []) as AgentCommissionEvent[],
  }
}

export async function createAgentCommission(input: NewAgentCommission): Promise<void> {
  const { error } = await supabase.rpc('record_agent_commission', {
    p_lead_id: input.leadId,
    p_operation_reference: input.operationReference,
    p_eligible_amount: input.eligibleAmount,
    p_rate_percent: input.ratePercent,
    p_currency: input.currency,
    p_note: input.note.trim() || null,
  })
  if (error) throw new Error('agent_commission_create_failed')
}

export async function updateAgentCommissionStatus(input: AgentCommissionStatusChange): Promise<void> {
  const { error } = await supabase.rpc('update_agent_commission_status', {
    p_commission_id: input.commissionId,
    p_status: input.status,
    p_payment_reference: input.paymentReference.trim() || null,
    p_note: input.note.trim() || null,
  })
  if (error) throw new Error('agent_commission_update_failed')
}

export type { AgentCommissionStatus }
