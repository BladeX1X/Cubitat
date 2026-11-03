import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('../../../shared/lib/supabaseClient', () => ({ supabase: { rpc } }))

import { createAgentLead, updateAgentLeadStatus } from './agentLeadsRepository'

describe('agent leads domain', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a consented lead through its domain RPC', async () => {
    rpc.mockResolvedValue({ error: null })
    await createAgentLead({
      leadType: 'property', contactName: 'Ana Pérez', contactPhone: '+5351234567',
      propertyTitle: 'Casa Centro Habana', location: 'La Habana', consentConfirmed: true,
    })
    expect(rpc).toHaveBeenCalledWith('create_agent_lead', expect.objectContaining({
      p_lead_type: 'property', p_consent_confirmed: true, p_contact_name: 'Ana Pérez',
    }))
  })

  it('maps the database quota error to a safe domain error', async () => {
    rpc.mockResolvedValueOnce({ error: { code: '54000', message: 'Agent lead creation limit reached.' } })
    await expect(createAgentLead({
      leadType: 'property', contactName: 'Ana Pérez', contactPhone: '+5351234567',
      propertyTitle: 'Casa Centro Habana', location: 'La Habana', consentConfirmed: true,
    })).rejects.toThrow('agent_lead_limit_reached')
  })

  it('delegates status authorization to the RPC and records an optional reason', async () => {
    rpc.mockResolvedValue({ error: null })
    await updateAgentLeadStatus('lead-1', 'contacted', 'Llamada inicial')
    expect(rpc).toHaveBeenCalledWith('update_agent_lead_status', {
      p_lead_id: 'lead-1', p_status: 'contacted', p_note: 'Llamada inicial',
    })
    rpc.mockResolvedValueOnce({ error: new Error('private backend detail') })
    await expect(updateAgentLeadStatus('lead-1', 'contacted')).rejects.toThrow('agent_lead_status_update_failed')
  })
})
