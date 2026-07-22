import type { VerificationStatus } from '../kyc/types'

export type AgentProfile = {
  id: string
  full_name: string
  phone?: string | null
  email?: string | null
  avatar_url?: string | null
  agency_name?: string | null
  agency_logo?: string | null
  bio?: string | null
  license_number?: string | null
  verification_status: VerificationStatus
  created_at: string
}
