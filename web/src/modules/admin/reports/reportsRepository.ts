import { supabase } from '../../../shared/lib/supabaseClient'
import { PAGE_SIZE } from '../core/constants'
import type { PropertyReport } from '../core/types'

export async function fetchModerationReports(page: number) {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data, error, count } = await supabase
    .from('property_reports')
    .select(`
      id,
      property_id,
      reporter_id,
      reason,
      description,
      status,
      created_at,
      properties (id, title, cover_image, status)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error
  return { reports: (data ?? []) as unknown as PropertyReport[], total: count ?? 0 }
}

export async function resolveReport(reportId: string, propertyId: string) {
  const { error } = await supabase.rpc('resolve_property_report', {
    p_report_id: reportId,
    p_property_id: propertyId,
  })
  if (error) throw error
}

export async function dismissReport(reportId: string) {
  const { error } = await supabase
    .from('property_reports')
    .update({ status: 'dismissed' })
    .eq('id', reportId)
  if (error) throw error
}
