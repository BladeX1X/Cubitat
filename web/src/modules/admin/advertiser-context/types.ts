import type { ModerationProperty, ReportStatus } from '../core/types'

export type AdvertiserRiskLevel = 'low' | 'medium' | 'high'
export type AdvertiserSignalCode =
  | 'new_account'
  | 'pending_reports'
  | 'repeated_reports'
  | 'rejected_properties'

export type AdvertiserSignal = {
  code: AdvertiserSignalCode
  label: string
  detail: string
  severity: 'warning' | 'danger'
}

export type AdvertiserContextInput = {
  profileCreatedAt: string | null
  propertyStatuses: ModerationProperty['status'][]
  reportStatuses: ReportStatus[]
  lastPropertyAt: string | null
}

export type AdvertiserContext = {
  profileCreatedAt: string | null
  accountAgeDays: number | null
  lastPropertyAt: string | null
  propertyCounts: {
    total: number
    published: number
    pendingReview: number
    aiApproved: number
    aiRejected: number
    paused: number
  }
  reportCounts: { total: number; pending: number }
  riskLevel: AdvertiserRiskLevel
  signals: AdvertiserSignal[]
}
