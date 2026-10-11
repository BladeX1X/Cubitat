export type AuditAction = 'update' | 'delete' | 'document_submitted' | 'document_approved' | 'document_rejected'

export type AuditSource = 'admin' | 'owner' | 'automation' | 'system'

export type AuditActionFilter = AuditAction | 'all'

export type AuditSourceFilter = AuditSource | 'all'

export type AuditLogRow = {
  id: string
  property_id: string
  property_owner_id: string | null
  property_title: string | null
  actor_id: string | null
  actor_role: string
  action: AuditAction
  source: AuditSource
  provider: string | null
  old_status: string | null
  new_status: string | null
  old_moderation_message: string | null
  new_moderation_message: string | null
  changed_fields: string[]
  created_at: string
}

export type AuditLogEvent = {
  id: string
  propertyId: string
  propertyOwnerId: string | null
  propertyTitle: string | null
  actorId: string | null
  actorRole: string
  action: AuditAction
  source: AuditSource
  provider: string | null
  oldStatus: string | null
  newStatus: string | null
  oldModerationMessage: string | null
  newModerationMessage: string | null
  changedFields: string[]
  createdAt: string
}

export type AuditLogFilters = {
  action: AuditActionFilter
  source: AuditSourceFilter
  query: string
}

export type FetchAuditLogParams = AuditLogFilters & {
  page: number
  pageSize: number
}
