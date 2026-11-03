export type AgentLeadKind = 'property' | 'client'
export type AgentLeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'

export type AgentGrowthLead = {
  id: string
  lead_type: AgentLeadKind
  contact_name: string
  contact_phone: string
  property_title: string | null
  location: string | null
  client_interest: string | null
  notes: string | null
  status: AgentLeadStatus
  created_at: string
}

export type AgentLeadEvent = {
  id: string
  lead_id: string
  from_status: AgentLeadStatus | null
  to_status: AgentLeadStatus
  actor_id: string | null
  note: string | null
  created_at: string
}

export type NewAgentLead = {
  leadType: AgentLeadKind
  contactName: string
  contactPhone: string
  propertyTitle?: string
  location?: string
  clientInterest?: string
  notes?: string
  consentConfirmed: boolean
}
