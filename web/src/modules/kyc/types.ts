export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export type KycRequest = {
  id: string
  user_id: string
  document_type: 'identity_card' | 'license' | 'passport'
  document_url: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string | null
  created_at: string
  updated_at: string
}
