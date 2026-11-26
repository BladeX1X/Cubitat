import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: { rpc },
}))

import { loadAgentAcquisitionMetrics } from './agentAcquisitionMetricsRepository'

describe('agent acquisition metrics', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads aggregate signup counts through the protected server RPC', async () => {
    rpc.mockResolvedValue({
      data: [{ registered_users: 7, paid_users: null, payment_tracking_available: false }],
      error: null,
    })

    await expect(loadAgentAcquisitionMetrics()).resolves.toEqual({ registeredUsers: 7, paidUsers: null })
    expect(rpc).toHaveBeenCalledWith('get_own_agent_acquisition_metrics')
  })

  it('rejects errors and malformed counts instead of displaying a false zero', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'private details' } })
    await expect(loadAgentAcquisitionMetrics()).rejects.toThrow('agent_acquisition_metrics_load_failed:42501')

    rpc.mockResolvedValueOnce({
      data: [{ registered_users: -1, paid_users: 0, payment_tracking_available: true }],
      error: null,
    })
    await expect(loadAgentAcquisitionMetrics()).rejects.toThrow('agent_acquisition_metrics_load_failed:INVALID_RESPONSE')

    rpc.mockResolvedValueOnce({ data: [], error: null })
    await expect(loadAgentAcquisitionMetrics()).rejects.toThrow('agent_acquisition_metrics_load_failed:INVALID_RESPONSE')
  })

  it('accepts a verified payment count only when tracking is available', async () => {
    rpc.mockResolvedValue({
      data: [{ registered_users: 4, paid_users: 2, payment_tracking_available: true }],
      error: null,
    })

    await expect(loadAgentAcquisitionMetrics()).resolves.toEqual({ registeredUsers: 4, paidUsers: 2 })
  })
})
