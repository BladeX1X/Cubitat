import type { ModerationProperty, ReportStatus, StatusFilter } from './types'

export const PAGE_SIZE = 15

export const STATUS_LABELS: Record<ModerationProperty['status'], string> = {
  published: 'Publicada',
  pending_review: 'Pendiente',
  paused: 'Oculta',
  ai_approved: 'Aprobada por IA',
  ai_rejected: 'Rechazada por IA',
}

export const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'pending_review', label: 'Pendientes' },
  { value: 'ai_approved', label: 'IA: Aprobadas' },
  { value: 'ai_rejected', label: 'IA: Rechazadas' },
  { value: 'published', label: 'Publicadas' },
  { value: 'paused', label: 'Ocultas' },
  { value: 'all', label: 'Todas' },
]

export const REASON_LABELS: Record<string, string> = {
  FRAUD: 'Fraude o estafa',
  INCORRECT_INFO: 'Información falsa/desactualizada',
  SPAM: 'Publicidad o spam',
  OTHER: 'Otro motivo',
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  pending: 'Pendiente',
  resolved: 'Resuelto (Ocultado)',
  dismissed: 'Descartado',
}
