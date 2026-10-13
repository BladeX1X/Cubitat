import { supabase } from '../../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'
import { fetchPropertyTrustScore, type PropertyTrustScore } from '../trust-score'

export type PendingPropertyVerification = {
  id: string
  property_id: string
  owner_id: string
  document_type: string
  document_path: string
  notes: string | null
  status: string
  created_at: string
  signed_url: string | null
  trust_score: PropertyTrustScore | null
  properties?: { title?: string | null; location?: string | null } | null
}

export type { PropertyTrustScore } from '../trust-score'

async function createSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from('property_documents').createSignedUrl(path, 300)
  if (error) {
    logSafeEvent({ module: 'admin_property_verification', action: 'sign_document', level: 'warn', code: sanitizeErrorReason(error) })
    return null
  }
  return data?.signedUrl ?? null
}

async function fetchTrustScore(propertyId: string): Promise<PropertyTrustScore | null> {
  try {
    return await fetchPropertyTrustScore(propertyId)
  } catch {
    logSafeEvent({ module: 'admin_property_verification', action: 'fetch_trust_score', level: 'warn', code: 'trust_score_unavailable' })
    return null
  }
}

export async function fetchPendingPropertyVerifications(): Promise<PendingPropertyVerification[]> {
  const { data, error } = await supabase
    .from('property_verification_requests')
    .select('id,property_id,owner_id,document_type,document_path,notes,status,created_at,properties(title,location)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    logSafeEvent({ module: 'admin_property_verification', action: 'fetch_pending', level: 'error', code: sanitizeErrorReason(error) })
    throw new Error('No se pudieron cargar las verificaciones documentales.')
  }

  const rows = (data ?? []) as unknown as Omit<PendingPropertyVerification, 'signed_url' | 'trust_score'>[]
  return Promise.all(rows.map(async (row) => ({
    ...row,
    signed_url: await createSignedUrl(row.document_path),
    trust_score: await fetchTrustScore(row.property_id),
  })))
}

export async function reviewPropertyVerification(requestId: string, status: 'approved' | 'rejected', reason?: string) {
  const { error } = await supabase.rpc('review_property_verification', {
    p_request_id: requestId,
    p_status: status,
    p_reason: reason ?? null,
  })
  if (error) {
    logSafeEvent({ module: 'admin_property_verification', action: 'review_request', level: 'error', code: sanitizeErrorReason(error) })
    throw new Error('No se pudo procesar la verificación documental.')
  }
}
