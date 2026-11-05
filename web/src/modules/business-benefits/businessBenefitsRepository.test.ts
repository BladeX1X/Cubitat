import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../../shared/lib/supabaseClient'
import { fetchActiveBusinessBenefits, fetchBusinessBenefits, grantBusinessBenefit, revokeBusinessBenefit } from './businessBenefitsRepository'

vi.mock('../../shared/lib/supabaseClient', () => ({ supabase: { rpc: vi.fn() } }))

const benefitRow = {
  id: 'row', target_type: 'account', target_id: 'target', benefit_code: 'commercial_badge',
  starts_at: '2026-10-01T00:00:00Z', expires_at: '2026-11-01T00:00:00Z', granted_by: 'admin',
  grant_reason: 'Campaign', revoked_at: null, revoked_by: null, revocation_reason: null,
  created_at: '2026-10-01T00:00:00Z',
}

describe('F4-BIZ repository', () => {
  beforeEach(() => vi.mocked(supabase.rpc).mockReset())

  it('parses the restricted admin queue through its RPC', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [benefitRow], error: null } as never)
    await expect(fetchBusinessBenefits()).resolves.toMatchObject([{ id: 'row', targetType: 'account' }])
    expect(supabase.rpc).toHaveBeenCalledWith('get_admin_business_benefits')
  })

  it('calls the public read projection without requesting private fields', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [{ benefit_code: 'commercial_badge', starts_at: benefitRow.starts_at, expires_at: benefitRow.expires_at }], error: null } as never)
    await expect(fetchActiveBusinessBenefits('account', 'target')).resolves.toEqual([
      { benefitCode: 'commercial_badge', startsAt: benefitRow.starts_at, expiresAt: benefitRow.expires_at },
    ])
    expect(supabase.rpc).toHaveBeenCalledWith('get_active_business_benefits', {
      p_target_type: 'account', p_target_id: 'target', p_at: expect.any(String),
    })
  })

  it('validates a grant before calling its AAL2 RPC', async () => {
    await expect(grantBusinessBenefit({ targetType: 'account', targetId: '', benefitCode: 'commercial_badge', startsAt: '2026-10-01T00:00', expiresAt: '2026-11-01T00:00', reason: 'Campaign' })).rejects.toThrow('INVALID_TARGET')
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('uses the dedicated revoke RPC and returns its result', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: true, error: null } as never)
    await expect(revokeBusinessBenefit('row', 'Terminated campaign')).resolves.toBe(true)
    expect(supabase.rpc).toHaveBeenCalledWith('revoke_business_benefit', { p_benefit_id: 'row', p_reason: 'Terminated campaign' })
  })
})
