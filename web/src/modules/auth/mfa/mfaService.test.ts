import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../../../shared/lib/supabaseClient'
import {
  getAdminMfaStatus,
  getAdminMfaBypassUntil,
  MfaVerificationError,
  startTotpEnrollment,
  verifyTotp,
} from './mfaService'

vi.mock('../../../shared/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn(),
        listFactors: vi.fn(),
        unenroll: vi.fn(),
        enroll: vi.fn(),
        challengeAndVerify: vi.fn(),
      },
    },
    rpc: vi.fn(),
  },
}))

describe('mfaService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.auth.mfa.getAuthenticatorAssuranceLevel).mockResolvedValue({
      data: { currentLevel: 'aal2', nextLevel: 'aal2' },
      error: null,
    } as never)
    vi.mocked(supabase.auth.mfa.listFactors).mockResolvedValue({
      data: {
        all: [
          { id: 'verified-1', factor_type: 'totp', status: 'verified' },
          { id: 'pending-1', factor_type: 'totp', status: 'unverified' },
          { id: 'phone-1', factor_type: 'phone', status: 'verified' },
        ],
      },
      error: null,
    } as never)
  })

  it('returns the current AAL and only TOTP factor ids', async () => {
    await expect(getAdminMfaStatus()).resolves.toEqual({
      currentLevel: 'aal2',
      verifiedFactorId: 'verified-1',
      unverifiedFactorIds: ['pending-1'],
    })
  })

  it('returns the database-controlled admin MFA expiry', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: '2026-10-20T17:00:00Z', error: null } as never)

    await expect(getAdminMfaBypassUntil()).resolves.toBe('2026-10-20T17:00:00Z')
    expect(supabase.rpc).toHaveBeenCalledWith('get_admin_mfa_bypass_until')
  })

  it('fails closed when the bypass status cannot be read', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('private details') } as never)

    await expect(getAdminMfaBypassUntil()).resolves.toBeNull()
  })

  it('fails closed when factor status cannot be loaded', async () => {
    vi.mocked(supabase.auth.mfa.listFactors).mockResolvedValue({ data: null, error: new Error('private details') } as never)

    await expect(getAdminMfaStatus()).rejects.toThrow('MFA status unavailable')
  })

  it('cleans pending factors before starting a new TOTP enrollment', async () => {
    vi.mocked(supabase.auth.mfa.unenroll).mockResolvedValue({ error: null } as never)
    vi.mocked(supabase.auth.mfa.enroll).mockResolvedValue({
      data: { id: 'new-factor', totp: { qr_code: 'otpauth://totp/cubitat' } },
      error: null,
    } as never)

    await expect(startTotpEnrollment(['pending-1'])).resolves.toEqual({
      factorId: 'new-factor',
      qrCode: 'otpauth://totp/cubitat',
    })
    expect(supabase.auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: 'pending-1' })
    expect(supabase.auth.mfa.enroll).toHaveBeenCalledWith({
      factorType: 'totp',
      friendlyName: 'Panel administrativo Cubitat',
    })
  })

  it('does not enroll a second factor if cleanup fails', async () => {
    vi.mocked(supabase.auth.mfa.unenroll).mockResolvedValue({ error: new Error('cleanup failed') } as never)

    await expect(startTotpEnrollment(['pending-1'])).rejects.toThrow('MFA cleanup failed')
    expect(supabase.auth.mfa.enroll).not.toHaveBeenCalled()
  })

  it.each([
    [{ code: 'session_not_found' }, 'session_expired'],
    [{ code: 'mfa_verification_failed' }, 'invalid_code'],
    [{ status: 422 }, 'invalid_code'],
    [{ status: 503 }, 'unavailable'],
  ])('classifies verification failures without exposing provider details', async (error, reason) => {
    vi.mocked(supabase.auth.mfa.challengeAndVerify).mockResolvedValue({ error } as never)

    const failure = await verifyTotp('factor-1', '123456').catch((caught) => caught)

    expect(failure).toBeInstanceOf(MfaVerificationError)
    expect(failure.reason).toBe(reason)
    expect(failure.message).toBe('MFA verification failed')
  })
})
