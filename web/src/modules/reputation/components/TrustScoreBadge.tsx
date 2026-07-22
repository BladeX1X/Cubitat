import { Star } from 'lucide-react'
import {
  calculateTrustScore,
  type ProfileReputationInput,
  type TrustScoreLevel,
} from '../reputationCalculator'

export type TrustScoreBadgeProps = {
  score?: number
  label?: TrustScoreLevel | string
  profileData?: ProfileReputationInput
  compact?: boolean
  className?: string
  showStar?: boolean
}

export function TrustScoreBadge({
  score: propScore,
  label: propLabel,
  profileData,
  compact = false,
  className = '',
  showStar = true,
}: TrustScoreBadgeProps) {
  let score: number
  let label: string

  if (typeof propScore === 'number' && propLabel) {
    score = propScore
    label = propLabel
  } else if (profileData) {
    const result = calculateTrustScore(profileData)
    score = result.score
    label = result.label
  } else {
    score = propScore ?? 3.0
    label = propLabel ?? 'Nuevo'
  }

  const formattedScore = score.toFixed(1)

  // Style variant according to score / label
  let badgeStyles = 'bg-neutral-100 text-neutral-800 border-neutral-200/80'
  let starColor = 'text-amber-500 fill-amber-500'

  if (label === 'Excelente' || score >= 4.5) {
    badgeStyles = 'bg-emerald-50 text-emerald-900 border-emerald-200/80'
    starColor = 'text-amber-500 fill-amber-500'
  } else if (label === 'Verificado' || score >= 3.5) {
    badgeStyles = 'bg-teal-50 text-teal-900 border-teal-200/80'
    starColor = 'text-amber-500 fill-amber-500'
  }

  const paddingText = compact
    ? 'px-2 py-0.5 text-[11px] font-semibold gap-1'
    : 'px-2.5 py-1 text-xs font-bold gap-1.5'

  return (
    <span
      role="status"
      aria-label={`Score de confianza: ${formattedScore} de 5.0 - Nivel ${label}`}
      title={`Nivel de Confianza: ${formattedScore} / 5.0 (${label})`}
      className={`inline-flex items-center rounded-full border shadow-2xs whitespace-nowrap transition-colors ${badgeStyles} ${paddingText} ${className}`}
    >
      {showStar && (
        <Star
          className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${starColor} shrink-0`}
          aria-hidden="true"
        />
      )}
      <span>
        {formattedScore} · {label}
      </span>
    </span>
  )
}
