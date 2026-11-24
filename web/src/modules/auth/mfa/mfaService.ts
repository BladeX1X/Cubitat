import { supabase } from '../../../shared/lib/supabaseClient'

// Reenable only alongside a migration restoring is_admin_aal2() enforcement.
export const ADMIN_MFA_ENABLED = false

export type AdminMfaStatus = {
  currentLevel: string | null
  verifiedFactorId: string | null
  unverifiedFactorIds: string[]
}

export type MfaVerificationFailure = 'session_expired' | 'invalid_code' | 'unavailable'

export class MfaVerificationError extends Error {
  readonly reason: MfaVerificationFailure

  constructor(reason: MfaVerificationFailure) {
    super('MFA verification failed')
    this.name = 'MfaVerificationError'
    this.reason = reason
  }
}

function classifyMfaVerificationFailure(error: unknown): MfaVerificationFailure {
  const details = error as { code?: unknown; status?: unknown }
  const code = typeof details?.code === 'string' ? details.code : ''
  const status = typeof details?.status === 'number' ? details.status : null

  if (code === 'session_not_found' || code === 'refresh_token_not_found') {
    return 'session_expired'
  }

  if (code === 'mfa_verification_failed' || code === 'mfa_challenge_expired' || status === 422) {
    return 'invalid_code'
  }

  return 'unavailable'
}

export async function getAdminMfaStatus(): Promise<AdminMfaStatus> {
  const [aalResult, factorsResult] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ])

  if (aalResult.error || !aalResult.data || factorsResult.error || !factorsResult.data) {
    throw new Error('MFA status unavailable')
  }

  const verifiedFactor = factorsResult.data.all.find((factor) => (
    factor.factor_type === 'totp' && factor.status === 'verified'
  ))

  return {
    currentLevel: aalResult.data.currentLevel,
    verifiedFactorId: verifiedFactor?.id ?? null,
    unverifiedFactorIds: factorsResult.data.all
      .filter((factor) => factor.factor_type === 'totp' && factor.status === 'unverified')
      .map((factor) => factor.id),
  }
}

export async function getAdminMfaBypassUntil(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_admin_mfa_bypass_until')
  if (error) return null
  return typeof data === 'string' && Number.isFinite(Date.parse(data)) ? data : null
}

export async function startTotpEnrollment(unverifiedFactorIds: string[]) {
  for (const factorId of unverifiedFactorIds) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) throw new Error('MFA cleanup failed')
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Panel administrativo Cubitat',
  })
  if (error || !data) throw new Error('MFA enrollment failed')

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
  }
}

export async function verifyTotp(factorId: string, code: string) {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
  if (error) throw new MfaVerificationError(classifyMfaVerificationFailure(error))
}
