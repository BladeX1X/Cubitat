import { createAgentCommission, loadAdminAgentCommissions, updateAgentCommissionStatus } from '../../agents/commissions/agentCommissionsRepository'
import type { AdminAgentCommission } from '../../agents/commissions/agentCommissionsRepository'
import type { AgentCommissionEvent, AgentCommissionStatus } from '../../agents/commissions/types'
import { loadAdminAgentLeads, updateAgentLeadStatus } from '../../agents/leads/agentLeadsRepository'
import type { AdminAgentLead } from '../../agents/leads/agentLeadsRepository'
import type { AgentLeadEvent, AgentLeadStatus } from '../../agents/leads/types'

export type { AdminAgentCommission, AdminAgentLead }

/** Admin console composer. Domain repositories own all reads and mutations. */
export async function loadAgentGrowthOperations(): Promise<{
  leads: AdminAgentLead[]
  commissions: AdminAgentCommission[]
  leadEvents: AgentLeadEvent[]
  commissionEvents: AgentCommissionEvent[]
  failedModules: Array<'leads' | 'commissions'>
}> {
  const [leadResult, commissionResult] = await Promise.allSettled([
    loadAdminAgentLeads(),
    loadAdminAgentCommissions(),
  ])
  const leadData = leadResult.status === 'fulfilled' ? leadResult.value : null
  const commissionData = commissionResult.status === 'fulfilled' ? commissionResult.value : null
  return {
    leads: leadData?.leads ?? [],
    commissions: commissionData?.commissions ?? [],
    leadEvents: leadData?.events ?? [],
    commissionEvents: commissionData?.events ?? [],
    failedModules: [
      ...(leadData ? [] : ['leads' as const]),
      ...(commissionData ? [] : ['commissions' as const]),
    ],
  }
}

export async function changeAdminLeadStatus(leadId: string, status: AgentLeadStatus, note: string): Promise<void> {
  await updateAgentLeadStatus(leadId, status, note)
}

export async function addAgentCommission(input: {
  leadId: string
  operationReference: string
  eligibleAmount: number
  ratePercent: number
  currency: 'USD' | 'CUP'
  note: string
}): Promise<void> {
  await createAgentCommission(input)
}

export async function changeAgentCommissionStatus(input: {
  commissionId: string
  status: AgentCommissionStatus
  paymentReference: string
  note: string
}): Promise<void> {
  await updateAgentCommissionStatus(input)
}
