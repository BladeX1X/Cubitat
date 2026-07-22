import { ShieldCheck, CheckCircle2, Clock } from 'lucide-react'
import type { VerificationStatus } from '../types'

type VerificationBadgeProps = {
  status: VerificationStatus
  isAgent?: boolean
  className?: string
  compact?: boolean
}

export function VerificationBadge({
  status,
  isAgent = false,
  className = '',
  compact = false,
}: VerificationBadgeProps) {
  if (status === 'unverified' && !isAgent) {
    return null
  }

  if (status === 'verified') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } ${className}`}
        title="Este anunciante ha verificado su identidad oficialmente"
      >
        <ShieldCheck className={compact ? 'w-3 h-3 text-emerald-600' : 'w-3.5 h-3.5 text-emerald-600'} />
        <span>{isAgent ? 'Agente Verificado' : 'Verificado'}</span>
      </span>
    )
  }

  if (status === 'pending') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 ${
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } ${className}`}
      >
        <Clock className={compact ? 'w-3 h-3 text-amber-600' : 'w-3.5 h-3.5 text-amber-600'} />
        <span>Verificación en revisión</span>
      </span>
    )
  }

  if (isAgent) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-bold rounded-full bg-teal-50 text-teal-800 border border-teal-200/80 ${
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } ${className}`}
      >
        <CheckCircle2 className={compact ? 'w-3 h-3 text-teal-600' : 'w-3.5 h-3.5 text-teal-600'} />
        <span>Agente Inmobiliario</span>
      </span>
    )
  }

  return null
}
