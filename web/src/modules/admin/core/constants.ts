import type { ModerationProperty, ReportStatus, StatusFilter } from './types'

export const PAGE_SIZE = 15

export const STATUS_LABELS: Record<ModerationProperty['status'], string> = {
  published: 'Publicada',
  pending_review: 'Pendiente',
  paused: 'Oculta por moderación',
  owner_hidden: 'Oculta por propietario',
  ai_approved: 'Aprobada por IA',
  ai_rejected: 'Rechazada por IA',
}

export const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'pending_review', label: 'Pendientes' },
  { value: 'ai_approved', label: 'IA: Aprobadas' },
  { value: 'ai_rejected', label: 'IA: Rechazadas' },
  { value: 'published', label: 'Publicadas' },
  { value: 'paused', label: 'Ocultas por moderación' },
  { value: 'owner_hidden', label: 'Ocultas por propietario' },
  { value: 'all', label: 'Todas' },
]

export const IMAGE_DUPLICATE_FILTER = { value: 'image_duplicates' as const, label: 'Coincidencias pHash' }

export const REASON_LABELS: Record<string, string> = {
  FRAUD: 'Fraude o estafa',
  INCORRECT_INFO: 'Información falsa/desactualizada',
  SPAM: 'Publicidad o spam',
  OTHER: 'Otro motivo',
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pendiente',
  resolved: 'Resuelto',
  dismissed: 'Descartado',
}
