import type { AuditAction, AuditLogEvent, AuditSource } from './types'

const STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pendiente', ai_approved: 'Aprobada por IA', ai_rejected: 'Rechazada por IA',
  published: 'Publicada', paused: 'Oculta',
}
const SOURCE_LABELS: Record<AuditSource, string> = {
  admin: 'Administrador', owner: 'Propietario', automation: 'Automatización', system: 'Sistema',
}
const AUDIT_DATE_FORMATTER = new Intl.DateTimeFormat('es-CU', { dateStyle: 'medium', timeStyle: 'short' })

export function formatAuditAction(event: Pick<AuditLogEvent, 'action' | 'source' | 'newStatus'>) {
  if (event.action === 'delete') return 'Eliminación'
  if (event.source === 'owner') return 'Actualización del propietario'
  if (event.source === 'automation') {
    if (event.newStatus === 'ai_approved') return 'Aprobación por IA'
    if (event.newStatus === 'ai_rejected') return 'Rechazo por IA'
    if (event.newStatus === 'pending_review') return 'Reevaluación por IA'
    return 'Resultado automático'
  }
  if (event.source === 'admin') {
    if (event.newStatus === 'published') return 'Aprobación manual'
    if (event.newStatus === 'paused') return 'Ocultamiento'
  }
  return 'Actualización'
}

export function formatAuditSource(source: AuditSource) {
  return SOURCE_LABELS[source]
}

export function formatAuditStatus(status: string | null) {
  if (!status) return 'Sin estado'
  return STATUS_LABELS[status] ?? status.replaceAll('_', ' ')
}

export function formatAuditDate(date: string) {
  return AUDIT_DATE_FORMATTER.format(new Date(date))
}

export function getAuditReason(event: {
  action: AuditAction
  oldModerationMessage: string | null
  newModerationMessage: string | null
}) {
  return event.action === 'delete'
    ? event.oldModerationMessage || 'Sin motivo registrado.'
    : event.newModerationMessage || 'Sin motivo registrado.'
}
