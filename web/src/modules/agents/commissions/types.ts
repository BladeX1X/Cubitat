export type AgentCommissionStatus = 'pending' | 'approved' | 'paid' | 'void'

export type AgentCommission = {
  id: string
  operation_reference: string
  eligible_amount: number | string
  rate_percent: number | string
  commission_amount: number | string
  currency: 'USD' | 'CUP'
  status: AgentCommissionStatus
  created_at: string
  paid_at: string | null
}

export type AgentCommissionEvent = {
  id: string
  commission_id: string
  action: 'created' | 'approved' | 'paid' | 'void'
  previous_status: AgentCommissionStatus | null
  new_status: AgentCommissionStatus
  actor_id: string | null
  note: string | null
  created_at: string
}

export type NewAgentCommission = {
  leadId: string
  operationReference: string
  eligibleAmount: number
  ratePercent: number
  currency: 'USD' | 'CUP'
  note: string
}

export type AgentCommissionStatusChange = {
  commissionId: string
  status: AgentCommissionStatus
  paymentReference: string
  note: string
}
