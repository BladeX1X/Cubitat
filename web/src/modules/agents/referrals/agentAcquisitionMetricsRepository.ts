import { supabase } from '../../../shared/lib/supabaseClient'

export type AgentAcquisitionMetrics = {
  registeredUsers: number
  paidUsers: number | null
}

type AcquisitionMetricsRow = {
  registered_users: number
  paid_users: number | null
  payment_tracking_available: boolean
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** Reads only the caller's aggregate signup count; it never returns referred-user details. */
export async function loadAgentAcquisitionMetrics(): Promise<AgentAcquisitionMetrics> {
  const { data, error } = await supabase.rpc('get_own_agent_acquisition_metrics')
  if (error) throw new Error(`agent_acquisition_metrics_load_failed:${error.code || 'RPC_ERROR'}`)

  const row = Array.isArray(data) && data.length === 1 ? data[0] as AcquisitionMetricsRow : null
  if (!row || !isCount(row.registered_users)) {
    throw new Error('agent_acquisition_metrics_load_failed:INVALID_RESPONSE')
  }

  if (row.payment_tracking_available) {
    if (!isCount(row.paid_users)) throw new Error('agent_acquisition_metrics_load_failed:INVALID_RESPONSE')
    return { registeredUsers: row.registered_users, paidUsers: row.paid_users }
  }

  if (row.paid_users !== null) throw new Error('agent_acquisition_metrics_load_failed:INVALID_RESPONSE')
  return { registeredUsers: row.registered_users, paidUsers: null }
}
