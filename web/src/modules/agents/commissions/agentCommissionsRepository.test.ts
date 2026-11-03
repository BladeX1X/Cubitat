import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('../../../shared/lib/supabaseClient', () => ({ supabase: { rpc } }))

import { createAgentCommission, updateAgentCommissionStatus } from './agentCommissionsRepository'

describe('agent commissions domain', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends commission terms to the server calculation RPC', async () => {
    rpc.mockResolvedValue({ error: null })
    await createAgentCommission({
      leadId: 'lead-1', operationReference: 'OP-001', eligibleAmount: 1234.56,
      ratePercent: 7.5, currency: 'USD', note: 'Cierre confirmado',
    })
    expect(rpc).toHaveBeenCalledWith('record_agent_commission', expect.objectContaining({
      p_lead_id: 'lead-1', p_eligible_amount: 1234.56, p_rate_percent: 7.5, p_currency: 'USD',
    }))
  })

  it('sends explicit status and payment evidence to the server', async () => {
    rpc.mockResolvedValue({ error: null })
    await updateAgentCommissionStatus({
      commissionId: 'commission-1', status: 'paid', paymentReference: 'TX-2201', note: '',
    })
    expect(rpc).toHaveBeenCalledWith('update_agent_commission_status', expect.objectContaining({
      p_commission_id: 'commission-1', p_status: 'paid', p_payment_reference: 'TX-2201',
    }))
  })
})
