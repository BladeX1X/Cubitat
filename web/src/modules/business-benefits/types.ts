export const BUSINESS_BENEFIT_TARGET_TYPES = ['account', 'service_profile', 'material_listing'] as const
export type BusinessBenefitTargetType = (typeof BUSINESS_BENEFIT_TARGET_TYPES)[number]

export const BUSINESS_BENEFIT_CODES = [
  'listing_featured', 'profile_featured', 'priority_contact', 'commercial_badge',
] as const
export type BusinessBenefitCode = (typeof BUSINESS_BENEFIT_CODES)[number]

export type BusinessBenefit = {
  id: string
  targetType: BusinessBenefitTargetType
  targetId: string
  benefitCode: BusinessBenefitCode
  startsAt: string
  expiresAt: string
  grantedBy: string
  grantReason: string
  revokedAt: string | null
  revokedBy: string | null
  revocationReason: string | null
  createdAt: string
}

export type ActiveBusinessBenefit = Pick<BusinessBenefit, 'benefitCode' | 'startsAt' | 'expiresAt'>
