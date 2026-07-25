import { supabase } from '../../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../../shared/lib/logger'

export type PendingKycRequest = {
  id: string
  user_id: string
  document_type: string
  document_path: string
  selfie_path: string | null
  document_signed_url: string | null
  selfie_signed_url: string | null
  status: string
  rejection_reason?: string | null
  created_at: string
  updated_at?: string
  full_name?: string | null
  email?: string | null
  profiles?: {
    full_name: string | null
    email: string | null
  } | null
}

async function createEvidenceSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null
  const { data, error } = await supabase.storage.from('kyc_documents').createSignedUrl(path, 300)
  if (error) {
    logSafeEvent({
      module: 'admin_kyc',
      action: 'sign_document',
      level: 'warn',
      code: sanitizeErrorReason(error),
    })
    return null
  }
  return data?.signedUrl ?? null
}

export async function fetchPendingKycRequests(): Promise<PendingKycRequest[]> {
  const { data, error } = await supabase
    .from('kyc_requests')
    .select(`
      id,
      user_id,
      document_type,
      document_path,
      selfie_path,
      status,
      rejection_reason,
      created_at,
      updated_at,
      profiles (
        full_name,
        email
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    logSafeEvent({ module: 'admin_kyc', action: 'fetch_pending', level: 'error', code: sanitizeErrorReason(error) })
    throw new Error('No se pudieron cargar las solicitudes KYC pendientes.')
  }

  const rawData = (data ?? []) as unknown as Array<{
    id: string
    user_id: string
    document_type: string
    document_path: string
    selfie_path: string | null
    status: string
    rejection_reason?: string | null
    created_at: string
    updated_at?: string
    profiles?:
      | { full_name?: string | null; email?: string | null }
      | Array<{ full_name?: string | null; email?: string | null }>
      | null
  }>

  return Promise.all(rawData.map(async (item) => {
    const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
    const [documentSignedUrl, selfieSignedUrl] = await Promise.all([
      createEvidenceSignedUrl(item.document_path),
      createEvidenceSignedUrl(item.selfie_path),
    ])

    return {
      id: item.id,
      user_id: item.user_id,
      document_type: item.document_type,
      document_path: item.document_path,
      selfie_path: item.selfie_path,
      document_signed_url: documentSignedUrl,
      selfie_signed_url: selfieSignedUrl,
      status: item.status,
      rejection_reason: item.rejection_reason ?? null,
      created_at: item.created_at,
      updated_at: item.updated_at,
      profiles: profile ? { full_name: profile.full_name ?? null, email: profile.email ?? null } : null,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
    }
  }))
}

export async function reviewKycRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  reason?: string,
): Promise<void> {
  const { error } = await supabase.rpc('review_kyc_request', {
    p_request_id: requestId,
    p_status: status,
    p_reason: reason ?? null,
  })

  if (error) {
    logSafeEvent({ module: 'admin_kyc', action: 'review_request', level: 'error', code: sanitizeErrorReason(error) })
    throw new Error('No se pudo procesar la solicitud KYC.')
  }
}
