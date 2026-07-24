import { supabase } from '../../../shared/lib/supabaseClient'

export type AdminMfaStatus = {
  currentLevel: string | null
  verifiedFactorId: string | null
  unverifiedFactorIds: string[]
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
  if (error) throw new Error('MFA verification failed')
}
