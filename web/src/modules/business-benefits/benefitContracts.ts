import { BUSINESS_BENEFIT_CODES, BUSINESS_BENEFIT_TARGET_TYPES, type BusinessBenefit, type BusinessBenefitCode, type BusinessBenefitTargetType } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

export function parseBusinessBenefits(value: unknown): BusinessBenefit[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)
      || typeof item.id !== 'string'
      || typeof item.target_type !== 'string'
      || !BUSINESS_BENEFIT_TARGET_TYPES.includes(item.target_type as BusinessBenefitTargetType)
      || typeof item.target_id !== 'string'
      || typeof item.benefit_code !== 'string'
      || !BUSINESS_BENEFIT_CODES.includes(item.benefit_code as BusinessBenefitCode)
      || !isDateString(item.starts_at) || !isDateString(item.expires_at)
      || typeof item.granted_by !== 'string' || typeof item.grant_reason !== 'string'
      || !isDateString(item.created_at)
      || !(item.revoked_at === null || isDateString(item.revoked_at))
      || !(item.revoked_by === null || typeof item.revoked_by === 'string')
      || !(item.revocation_reason === null || typeof item.revocation_reason === 'string')) return []
    return [{
      id: item.id,
      targetType: item.target_type as BusinessBenefitTargetType,
      targetId: item.target_id,
      benefitCode: item.benefit_code as BusinessBenefitCode,
      startsAt: item.starts_at,
      expiresAt: item.expires_at,
      grantedBy: item.granted_by,
      grantReason: item.grant_reason,
      revokedAt: item.revoked_at,
      revokedBy: item.revoked_by,
      revocationReason: item.revocation_reason,
      createdAt: item.created_at,
    }]
  })
}

export function validateBenefitGrant(input: {
  targetId: string
  startsAt: string
  expiresAt: string
  reason: string
}): 'INVALID_TARGET' | 'INVALID_DATES' | 'INVALID_REASON' | null {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(input.targetId.trim())) return 'INVALID_TARGET'
  const startsAt = Date.parse(input.startsAt)
  const expiresAt = Date.parse(input.expiresAt)
  if (!Number.isFinite(startsAt) || !Number.isFinite(expiresAt)
    || expiresAt <= startsAt || expiresAt <= Date.now()) return 'INVALID_DATES'
  if (input.reason.trim().length < 5 || input.reason.trim().length > 500) return 'INVALID_REASON'
  return null
}

export function isBusinessBenefitActive(benefit: BusinessBenefit, at = new Date()): boolean {
  return benefit.revokedAt === null
    && Date.parse(benefit.startsAt) <= at.getTime()
    && Date.parse(benefit.expiresAt) > at.getTime()
}
