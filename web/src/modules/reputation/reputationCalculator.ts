export type ProfileReputationInput = {
  verificationStatus: string
  createdAt: string
  activePropertiesCount: number
  reportsCount: number
}

export type TrustScoreLevel = 'Excelente' | 'Verificado' | 'Nuevo'

export type TrustScoreResult = {
  score: number
  label: TrustScoreLevel
}

/**
 * Calculates a transparent reputation / trust score (1.0 - 5.0) and level label based on profile parameters.
 */
export function calculateTrustScore(profileData: ProfileReputationInput): TrustScoreResult {
  const {
    verificationStatus = 'unverified',
    createdAt,
    activePropertiesCount = 0,
    reportsCount = 0,
  } = profileData || {}

  let score = 2.5

  // 1. Verification status adjustment
  const statusLower = (verificationStatus || '').toLowerCase()
  if (statusLower === 'verified' || statusLower === 'identity_verified' || statusLower === 'approved') {
    score += 1.5
  } else if (statusLower === 'pending') {
    score += 0.2
  } else if (statusLower === 'rejected') {
    score -= 0.5
  }

  // 2. Account Antiquity / Seniority adjustment
  if (createdAt) {
    const createdDate = new Date(createdAt)
    if (!isNaN(createdDate.getTime())) {
      const now = new Date()
      const ageInMs = now.getTime() - createdDate.getTime()
      const ageInDays = Math.max(0, Math.floor(ageInMs / (1000 * 60 * 60 * 24)))

      if (ageInDays >= 365) {
        score += 1.0
      } else if (ageInDays >= 180) {
        score += 0.7
      } else if (ageInDays >= 90) {
        score += 0.4
      } else if (ageInDays >= 30) {
        score += 0.2
      }
    }
  }

  // 3. Active Listings adjustment
  const safeActiveProps = Math.max(0, activePropertiesCount)
  if (safeActiveProps >= 10) {
    score += 1.0
  } else if (safeActiveProps >= 5) {
    score += 0.7
  } else if (safeActiveProps >= 2) {
    score += 0.4
  } else if (safeActiveProps >= 1) {
    score += 0.2
  }

  // 4. Reports penalty & zero-report bonus
  const safeReports = Math.max(0, reportsCount)
  if (safeReports > 0) {
    score -= safeReports * 0.5
  } else if (safeActiveProps > 0 || statusLower === 'verified' || statusLower === 'identity_verified') {
    score += 0.3
  }

  // Clamp score strictly to range [1.0, 5.0] and round to 1 decimal place
  const roundedScore = Math.min(5.0, Math.max(1.0, Math.round(score * 10) / 10))

  // Determine reputation label
  let label: TrustScoreLevel = 'Nuevo'
  if (roundedScore >= 4.5) {
    label = 'Excelente'
  } else if (roundedScore >= 3.5 || statusLower === 'verified' || statusLower === 'identity_verified') {
    label = 'Verificado'
  } else {
    label = 'Nuevo'
  }

  return {
    score: roundedScore,
    label,
  }
}
