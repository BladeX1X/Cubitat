import { supabase } from '../../../shared/lib/supabaseClient'
import type { ModerationProperty, ReportStatus } from '../core/types'
import { buildAdvertiserContext } from './advertiserContext'

type ProfileRow = { created_at: string | null }
type PropertyRow = { id: string; status: ModerationProperty['status']; created_at: string }
type ReportRow = { status: ReportStatus }

export async function fetchAdvertiserContext(userId: string) {
  const [profileResult, propertiesResult] = await Promise.all([
    supabase.from('profiles').select('created_at').eq('id', userId).maybeSingle(),
    supabase.from('properties').select('id,status,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
  ])
  if (profileResult.error) throw profileResult.error
  if (propertiesResult.error) throw propertiesResult.error

  const profile = profileResult.data as unknown as ProfileRow | null
  const properties = (propertiesResult.data ?? []) as unknown as PropertyRow[]
  let reports: ReportRow[] = []
  const propertyIds = properties.map((property) => property.id)

  if (propertyIds.length > 0) {
    const reportsResult = await supabase
      .from('property_reports')
      .select('status')
      .in('property_id', propertyIds)
    if (reportsResult.error) throw reportsResult.error
    reports = (reportsResult.data ?? []) as unknown as ReportRow[]
  }

  return buildAdvertiserContext({
    profileCreatedAt: profile?.created_at ?? null,
    propertyStatuses: properties.map((property) => property.status),
    reportStatuses: reports.map((report) => report.status),
    lastPropertyAt: properties[0]?.created_at ?? null,
  })
}
