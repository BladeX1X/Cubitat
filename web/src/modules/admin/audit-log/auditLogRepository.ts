import { supabase } from '../../../shared/lib/supabaseClient'
import type { AuditLogEvent, AuditLogRow, FetchAuditLogParams } from './types'

const AUDIT_SELECT = [
  'id', 'property_id', 'property_owner_id', 'property_title', 'actor_id', 'actor_role',
  'action', 'source', 'provider', 'old_status', 'new_status', 'old_moderation_message',
  'new_moderation_message', 'changed_fields', 'created_at',
].join(',')

function toAuditLogEvent(row: AuditLogRow): AuditLogEvent {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyOwnerId: row.property_owner_id,
    propertyTitle: row.property_title,
    actorId: row.actor_id,
    actorRole: row.actor_role,
    action: row.action,
    source: row.source,
    provider: row.provider,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    oldModerationMessage: row.old_moderation_message,
    newModerationMessage: row.new_moderation_message,
    changedFields: row.changed_fields,
    createdAt: row.created_at,
  }
}

export async function fetchAuditLog(params: FetchAuditLogParams) {
  const from = params.page * params.pageSize
  const to = from + params.pageSize - 1
  let query = supabase
    .from('property_moderation_audit')
    .select(AUDIT_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })

  if (params.action !== 'all') query = query.eq('action', params.action)
  if (params.source !== 'all') query = query.eq('source', params.source)
  const titleQuery = params.query.trim()
  if (titleQuery) query = query.ilike('property_title', `%${titleQuery}%`)

  const { data, error, count } = await query.range(from, to)
  if (error) throw error

  return {
    events: ((data ?? []) as unknown as AuditLogRow[]).map(toAuditLogEvent),
    total: count ?? 0,
  }
}
