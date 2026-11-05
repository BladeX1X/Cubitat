import { supabase } from '../../shared/lib/supabaseClient'
import { logSafeEvent, sanitizeErrorReason } from '../../shared/lib/logger'

export type ServiceReview = {
  id: string
  providerId: string
  rating: number
  title: string
  body: string
  createdAt: string
}

export type OwnedServiceReview = ServiceReview & {
  status: 'pending_review' | 'published' | 'rejected' | 'hidden' | 'withdrawn'
}

function parseRows(value: unknown): ServiceReview[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((row) => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) return []
    const record = row as Record<string, unknown>
    if (typeof record.id !== 'string' || typeof record.provider_id !== 'string'
      || typeof record.rating !== 'number' || typeof record.title !== 'string'
      || typeof record.body !== 'string' || typeof record.created_at !== 'string') return []
    if (!Number.isInteger(record.rating) || record.rating < 1 || record.rating > 5) return []
    return [{ id: record.id, providerId: record.provider_id, rating: record.rating,
      title: record.title, body: record.body, createdAt: record.created_at }]
  })
}

export async function fetchServiceReviews(providerId: string): Promise<ServiceReview[]> {
  const { data, error } = await supabase.from('home_service_reviews')
    .select('id, provider_id, rating, title, body, created_at')
    .eq('provider_id', providerId).eq('status', 'published')
    .order('created_at', { ascending: false }).limit(50)
  if (error) {
    logSafeEvent({ module: 'service_reviews', action: 'load_published_reviews', level: 'error', code: sanitizeErrorReason(error) })
    throw new Error('SERVICE_REVIEWS_LOAD_FAILED')
  }
  return parseRows(data)
}

export async function fetchMyServiceReview(providerId: string): Promise<OwnedServiceReview | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null
  const { data, error } = await supabase.rpc('get_my_home_service_review', { p_provider_id: providerId })
  if (error) {
    logSafeEvent({ module: 'service_reviews', action: 'load_own_review', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error('SERVICE_REVIEW_LOAD_FAILED')
  }
  const [row] = Array.isArray(data) ? data : []
  const [review] = parseRows(row ? [row] : [])
  if (!review || typeof row.status !== 'string'
    || !['pending_review', 'published', 'rejected', 'hidden', 'withdrawn'].includes(row.status)) return null
  return { ...review, status: row.status as OwnedServiceReview['status'] }
}

export async function submitServiceReview(input: {
  providerId: string
  rating: number
  title: string
  body: string
}): Promise<void> {
  const { error } = await supabase.rpc('submit_home_service_review', {
    p_provider_id: input.providerId,
    p_rating: input.rating,
    p_title: input.title.trim(),
    p_body: input.body.trim(),
  })
  if (error) {
    logSafeEvent({ module: 'service_reviews', action: 'submit_review', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error('SERVICE_REVIEW_SUBMIT_FAILED')
  }
}

export async function reportServiceReview(reviewId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('report_home_service_review', { p_review_id: reviewId, p_reason: reason.trim() })
  if (error) {
    logSafeEvent({ module: 'service_reviews', action: 'report_review', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error('SERVICE_REVIEW_REPORT_FAILED')
  }
}

export async function requestServiceReviewRemoval(reviewId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('request_home_service_review_removal', { p_review_id: reviewId, p_reason: reason.trim() })
  if (error) {
    logSafeEvent({ module: 'service_reviews', action: 'withdraw_review', level: 'warn', code: sanitizeErrorReason(error) })
    throw new Error('SERVICE_REVIEW_WITHDRAW_FAILED')
  }
}
