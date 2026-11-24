import { supabase } from '../../../shared/lib/supabaseClient'
import { PAGE_SIZE } from '../core/constants'
import type { ModerationReport, PropertyReport } from '../core/types'

export async function fetchModerationReports(page: number) {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const [properties, marketplace] = await Promise.all([
    supabase.from('property_reports').select('id, property_id, reporter_id, reason, description, status, created_at, properties (id, title, cover_image, status)', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to),
    supabase.from('marketplace_listing_reports').select('id, listing_type, listing_id, listing_title, reporter_id, reason, description, status, created_at', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to),
  ])
  if (properties.error) throw properties.error
  if (marketplace.error) throw marketplace.error
  const propertyRows = ((properties.data ?? []) as unknown as Omit<PropertyReport, 'kind'>[]).map((row) => ({ ...row, kind: 'property' as const }))
  const marketplaceRows = (marketplace.data ?? []).map((row) => ({ ...row, kind: 'marketplace' as const })) as ModerationReport[]
  const reports = [...propertyRows, ...marketplaceRows].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, PAGE_SIZE)
  return { reports, total: (properties.count ?? 0) + (marketplace.count ?? 0) }
}

export async function resolveReport(report: ModerationReport) {
  if (report.kind === 'property') {
    const { error } = await supabase.rpc('resolve_property_report', { p_report_id: report.id, p_property_id: report.property_id })
    if (error) throw error
    return
  }
  const { error } = await supabase.rpc('review_marketplace_listing_report', { p_report_id: report.id, p_status: 'resolved' })
  if (error) throw error
}

export async function dismissReport(report: ModerationReport) {
  if (report.kind === 'property') {
    const { error } = await supabase.from('property_reports').update({ status: 'dismissed' }).eq('id', report.id)
    if (error) throw error
    return
  }
  const { error } = await supabase.rpc('review_marketplace_listing_report', { p_report_id: report.id, p_status: 'dismissed' })
  if (error) throw error
}
