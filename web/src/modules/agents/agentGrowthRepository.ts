import { loadAgentLeads } from './leads/agentLeadsRepository'
import type { AgentCommission, AgentCommissionEvent } from './commissions/types'
import type { AgentGrowthLead, AgentLeadEvent } from './leads/types'

export type { AgentCommission, AgentCommissionEvent, AgentCommissionStatus } from './commissions/types'
export type { AgentGrowthLead, AgentLeadEvent, AgentLeadKind, AgentLeadStatus, NewAgentLead } from './leads/types'
export type { AgentAttributedContact } from '../referrals/agentAttributionRepository'

export type AgentGrowthDashboard = {
  referralCode: string | null
  leads: AgentGrowthLead[]
  contacts: import('../referrals/agentAttributionRepository').AgentAttributedContact[]
  commissions: AgentCommission[]
  leadEvents: AgentLeadEvent[]
  commissionEvents: AgentCommissionEvent[]
  referralVisits: number
  failedModules: Array<'referrals' | 'visits' | 'leads' | 'contacts' | 'commissions'>
  failureCodes: Partial<Record<'referrals' | 'visits' | 'leads' | 'contacts' | 'commissions', string>>
}

/** Dashboard composition only: each domain owns its persistence contract. */
export async function loadAgentGrowthDashboard(): Promise<AgentGrowthDashboard> {
  const [leadResult] = await Promise.allSettled([loadAgentLeads()])
  const leadData = leadResult.status === 'fulfilled' ? leadResult.value : null
  const failedModules: AgentGrowthDashboard['failedModules'] = []
  const failureCodes: AgentGrowthDashboard['failureCodes'] = {}
  if (!leadData) failedModules.push('leads')

  return {
    referralCode: null,
    leads: leadData?.leads ?? [],
    contacts: [],
    referralVisits: 0,
    commissions: [],
    leadEvents: leadData?.events ?? [],
    commissionEvents: [],
    failedModules,
    failureCodes,
  }
}

export { createAgentLead, updateAgentLeadStatus } from './leads/agentLeadsRepository'
