import { describe, expect, it } from 'vitest'
import { formatAuditAction } from './formatters'
import type { AuditAction, AuditSource } from './types'

describe('formatAuditAction', () => {
  it.each<[AuditAction, AuditSource, string | null, string]>([
    ['update', 'admin', 'published', 'Aprobación manual'],
    ['update', 'admin', 'paused', 'Ocultamiento'],
    ['update', 'automation', 'ai_approved', 'Aprobación por IA'],
    ['update', 'automation', 'ai_rejected', 'Rechazo por IA'],
    ['update', 'automation', 'pending_review', 'Reevaluación por IA'],
    ['update', 'owner', 'pending_review', 'Actualización del propietario'],
    ['delete', 'admin', null, 'Eliminación'],
  ])('describes %s from %s as a useful moderation action', (action, source, newStatus, label) => {
    expect(formatAuditAction({ action, source, newStatus })).toBe(label)
  })
})
