export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export type KycRequest = {
  id: string
  user_id: string
  document_type: 'identity_card' | 'passport'
  document_path: string
  selfie_path: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason?: string | null
  created_at: string
  updated_at: string
}
