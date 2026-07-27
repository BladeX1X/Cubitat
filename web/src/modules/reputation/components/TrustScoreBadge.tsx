import { ShieldCheck } from 'lucide-react'
import type { ProfileReputationInput, TrustScoreLevel } from '../reputationCalculator'

export type TrustScoreBadgeProps = {
  score?: number
  label?: TrustScoreLevel | string
  profileData?: ProfileReputationInput
  compact?: boolean
  className?: string
  showStar?: boolean
}

export function TrustScoreBadge({
  profileData,
  label: propLabel,
  compact = false,
  className = '',
}: TrustScoreBadgeProps) {
  const isVerified =
    profileData?.verificationStatus === 'verified' ||
    profileData?.verificationStatus === 'identity_verified' ||
    propLabel === 'Verificado' ||
    propLabel === 'Excelente'

  if (!isVerified) return null

  const paddingText = compact
    ? 'px-2 py-0.5 text-[11px] font-semibold gap-1'
    : 'px-2.5 py-1 text-xs font-bold gap-1.5'

  return (
    <span
      role="status"
      aria-label="Agente Verificado"
      title="Agente Verificado por KYC"
      className={`inline-flex items-center rounded-full border shadow-2xs whitespace-nowrap transition-colors bg-teal-50 text-teal-900 border-teal-200/80 ${paddingText} ${className}`}
    >
      <ShieldCheck className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-teal-600 shrink-0`} />
      <span>Agente Verificado</span>
    </span>
  )
}
