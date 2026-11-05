import { supabase } from '../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'
import { parseBusinessBenefits, validateBenefitGrant } from './benefitContracts'
import { BUSINESS_BENEFIT_CODES, BUSINESS_BENEFIT_TARGET_TYPES, type ActiveBusinessBenefit, type BusinessBenefit, type BusinessBenefitCode, type BusinessBenefitTargetType } from './types'

function throwBenefitError(action: string, error: unknown): never {
  logSafeEvent({ module: 'admin', action, level: 'error', code: sanitizeErrorReason(error) })
  throw new Error('BUSINESS_BENEFITS_REQUEST_FAILED')
}

function parseActiveBenefits(value: unknown): ActiveBusinessBenefit[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return []
    const row = item as Record<string, unknown>
    if (typeof row.benefit_code !== 'string'
      || !BUSINESS_BENEFIT_CODES.includes(row.benefit_code as BusinessBenefitCode)
      || typeof row.starts_at !== 'string' || !Number.isFinite(Date.parse(row.starts_at))
      || typeof row.expires_at !== 'string' || !Number.isFinite(Date.parse(row.expires_at))) return []
    return [{ benefitCode: row.benefit_code as BusinessBenefitCode, startsAt: row.starts_at, expiresAt: row.expires_at }]
  })
}

export async function fetchBusinessBenefits(): Promise<BusinessBenefit[]> {
  try {
    const { data, error } = await supabase.rpc('get_admin_business_benefits')
    if (error) return throwBenefitError('load_admin_business_benefits', error)
    return parseBusinessBenefits(data)
  } catch (error) {
    return throwBenefitError('load_admin_business_benefits_exception', error)
  }
}

export async function fetchActiveBusinessBenefits(
  targetType: BusinessBenefitTargetType,
  targetId: string,
  at = new Date(),
): Promise<ActiveBusinessBenefit[]> {
  try {
    if (!BUSINESS_BENEFIT_TARGET_TYPES.includes(targetType) || !targetId.trim()) return []
    const { data, error } = await supabase.rpc('get_active_business_benefits', {
      p_target_type: targetType,
      p_target_id: targetId,
      p_at: at.toISOString(),
    })
    if (error) return throwBenefitError('load_active_business_benefits', error)
    return parseActiveBenefits(data)
  } catch (error) {
    return throwBenefitError('load_active_business_benefits_exception', error)
  }
}

export async function grantBusinessBenefit(input: {
  targetType: BusinessBenefitTargetType
  targetId: string
  benefitCode: BusinessBenefitCode
  startsAt: string
  expiresAt: string
  reason: string
}): Promise<string> {
  const validationError = validateBenefitGrant(input)
  if (validationError) throw new Error(validationError)
  if (!BUSINESS_BENEFIT_TARGET_TYPES.includes(input.targetType)
    || !BUSINESS_BENEFIT_CODES.includes(input.benefitCode)) throw new Error('INVALID_BENEFIT')
  try {
    const { data, error } = await supabase.rpc('grant_business_benefit', {
      p_target_type: input.targetType,
      p_target_id: input.targetId.trim(),
      p_benefit_code: input.benefitCode,
      p_starts_at: new Date(input.startsAt).toISOString(),
      p_expires_at: new Date(input.expiresAt).toISOString(),
      p_reason: input.reason.trim(),
    })
    if (error) return throwBenefitError('grant_business_benefit', error)
    if (typeof data !== 'string') throw new Error('BUSINESS_BENEFITS_INVALID_RESPONSE')
    return data
  } catch (error) {
    return throwBenefitError('grant_business_benefit_exception', error)
  }
}

export async function revokeBusinessBenefit(id: string, reason: string): Promise<boolean> {
  if (!id.trim() || reason.trim().length < 5 || reason.trim().length > 500) throw new Error('INVALID_BENEFIT_REVOCATION')
  try {
    const { data, error } = await supabase.rpc('revoke_business_benefit', {
      p_benefit_id: id,
      p_reason: reason.trim(),
    })
    if (error) return throwBenefitError('revoke_business_benefit', error)
    if (typeof data !== 'boolean') throw new Error('BUSINESS_BENEFITS_INVALID_RESPONSE')
    return data
  } catch (error) {
    return throwBenefitError('revoke_business_benefit_exception', error)
  }
}
