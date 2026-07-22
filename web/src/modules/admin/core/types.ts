export type AdminSection = 'properties' | 'reports' | 'metrics' | 'audit' | 'kyc'

export type StatusFilter =
  | 'pending_review'
  | 'ai_approved'
  | 'ai_rejected'
  | 'published'
  | 'paused'
  | 'owner_hidden'
  | 'all'

export type ReportStatus = 'pending' | 'resolved' | 'dismissed'
export type ReportStatusFilter = ReportStatus | 'all'

export type ModerationProperty = {
  id: string
  title: string
  location: string
  description: string
  price_usd: number | null
  cover_image: string | null
  images: string[] | null
  created_at: string
  user_id: string
  operation: string
  property_type: string
  bedrooms: number
  bathrooms: number
  parking: number
  area_m2: number
  age_years: number | null
  amenities: string[] | null
  features: Record<string, unknown> | null
  contact_info: { name?: string; phone?: string } | null
  status: Exclude<StatusFilter, 'all'>
  moderation_message: string | null
  user_email?: string
}

export type PropertyReport = {
  id: string
  property_id: string
  reporter_id: string | null
  reason: string
  description: string | null
  status: ReportStatus
  created_at: string
  properties: {
    id: string
    title: string
    cover_image: string | null
    status: string
  } | null
}

export type StatusCounts = Record<StatusFilter, number>

export type AdminDatabaseMetrics = {
  db_bytes: number
  storage_bytes: number
  properties_count: number
  users_count: number
  reports_count: number
}

export type ProviderError = string | null

export type AdminMetrics = {
  cloudflare: { requests: number | null; error: ProviderError }
  analytics: { activeUsers: number | null; error: ProviderError }
  supabase: {
    storage_bytes: number | null
    egress_bytes: number | null
    db_bytes: number | null
    error: ProviderError
  }
}
