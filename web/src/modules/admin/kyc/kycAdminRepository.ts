import { supabase } from '../../../shared/lib/supabaseClient'

export type PendingKycRequest = {
  id: string
  user_id: string
  document_type: string
  document_url: string
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

export async function fetchPendingKycRequests(): Promise<PendingKycRequest[]> {
  const { data, error } = await supabase
    .from('kyc_requests')
    .select(`
      id,
      user_id,
      document_type,
      document_url,
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

  if (error) throw error

  const rawData = (data ?? []) as unknown as Array<{
    id: string
    user_id: string
    document_type: string
    document_url: string
    status: string
    rejection_reason?: string | null
    created_at: string
    updated_at?: string
    profiles?:
      | { full_name?: string | null; email?: string | null }
      | Array<{ full_name?: string | null; email?: string | null }>
      | null
  }>

  return rawData.map((item) => {
    const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
    return {
      id: item.id,
      user_id: item.user_id,
      document_type: item.document_type,
      document_url: item.document_url,
      status: item.status,
      rejection_reason: item.rejection_reason ?? null,
      created_at: item.created_at,
      updated_at: item.updated_at,
      profiles: profile ? { full_name: profile.full_name ?? null, email: profile.email ?? null } : null,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
    }
  })
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

  if (error) throw error
}
