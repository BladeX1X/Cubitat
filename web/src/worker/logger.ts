export type WorkerLogLevel = 'info' | 'warn' | 'error'

const EVENTS = new Set([
  'auth_rate_limit_blocked',
  'auth_resend_rate_limited',
  'auth_resend_unavailable',
  'auth_user_lookup_failed',
  'metrics_provider_failed',
  'moderation_background_failed',
  'moderation_image_fetch_failed',
  'moderation_provider_request_failed',
  'password_exposure_check_unavailable',
  'seo_rewrite_failed',
  'transactional_email_failed',
  'transactional_email_skipped',
  'alert_email_dispatch_failed',
  'alert_email_dispatch_skipped',
  'kyc_evidence_claim_failed',
  'kyc_evidence_retention_unavailable',
  'kyc_evidence_retention_partial_failure',
  'push_dispatch_failed',
  'push_dispatch_skipped',
  'property_view_count_failed',
  'image_duplicate_decode_failed',
  'image_duplicate_request_failed',
  'image_duplicate_refresh_failed',
  'agent_application_submission_failed',
  'agent_application_upload_cleanup_failed',
  'agent_application_submitted',
  'agent_application_document_link_failed',
  'agent_application_email_skipped',
  'agent_application_email_claim_failed',
  'agent_application_email_release_failed',
  'agent_application_email_delivery_failed',
  'agent_application_purge_claim_failed',
  'agent_application_purge_release_failed',
  'agent_application_purge_failed',
] as const)

const ACTIONS = new Set(['login', 'token', 'signup', 'recover', 'resend', 'otp'] as const)
const DIMENSIONS = new Set(['ip', 'email'] as const)
const SOURCES = new Set([
  'google_analytics',
  'groq',
  'management_api',
  'pwned_passwords',
  'resend',
  'service_role',
] as const)
const REASONS = new Set([
  'missing_configuration', 'network_unavailable', 'phase2_disabled',
  'fetch_http', 'fetch_network', 'invalid_webp', 'decoder_init', 'decode',
  'upstream_http', 'invalid_response',
] as const)

export type WorkerLogEvent =
  | 'auth_rate_limit_blocked'
  | 'auth_resend_rate_limited'
  | 'auth_resend_unavailable'
  | 'auth_user_lookup_failed'
  | 'metrics_provider_failed'
  | 'moderation_background_failed'
  | 'moderation_image_fetch_failed'
  | 'moderation_provider_request_failed'
  | 'password_exposure_check_unavailable'
  | 'seo_rewrite_failed'
  | 'transactional_email_failed'
  | 'transactional_email_skipped'
  | 'alert_email_dispatch_failed'
  | 'alert_email_dispatch_skipped'
  | 'kyc_evidence_claim_failed'
  | 'kyc_evidence_retention_unavailable'
  | 'kyc_evidence_retention_partial_failure'
  | 'push_dispatch_failed'
  | 'push_dispatch_skipped'
  | 'property_view_count_failed'
  | 'image_duplicate_decode_failed'
  | 'image_duplicate_request_failed'
  | 'image_duplicate_refresh_failed'
  | 'agent_application_submission_failed'
  | 'agent_application_upload_cleanup_failed'
  | 'agent_application_submitted'
  | 'agent_application_document_link_failed'
  | 'agent_application_email_skipped'
  | 'agent_application_email_claim_failed'
  | 'agent_application_email_release_failed'
  | 'agent_application_email_delivery_failed'
  | 'agent_application_purge_claim_failed'
  | 'agent_application_purge_release_failed'
  | 'agent_application_purge_failed'

export interface WorkerLogFields {
  action?: 'login' | 'token' | 'signup' | 'recover' | 'resend' | 'otp'
  dimension?: 'ip' | 'email'
  source?: 'google_analytics' | 'groq' | 'management_api' | 'pwned_passwords' | 'resend' | 'service_role'
  status?: number
  reason?: 'missing_configuration' | 'network_unavailable' | 'phase2_disabled'
    | 'fetch_http' | 'fetch_network' | 'invalid_webp' | 'decoder_init' | 'decode'
    | 'upstream_http' | 'invalid_response'
  phase?: 'storage' | 'database'
}

export function logWorkerEvent(
  level: WorkerLogLevel,
  event: WorkerLogEvent,
  fields: WorkerLogFields = {},
): void {
  if (!EVENTS.has(event)) return

  const record: Record<string, string | number> = { event }
  const unsafeFields = fields as Record<string, unknown>

  if (typeof unsafeFields.action === 'string' && ACTIONS.has(unsafeFields.action as never)) {
    record.action = unsafeFields.action
  }
  if (typeof unsafeFields.dimension === 'string' && DIMENSIONS.has(unsafeFields.dimension as never)) {
    record.dimension = unsafeFields.dimension
  }
  if (typeof unsafeFields.source === 'string' && SOURCES.has(unsafeFields.source as never)) {
    record.source = unsafeFields.source
  }
  if (
    typeof unsafeFields.status === 'number'
    && Number.isInteger(unsafeFields.status)
    && unsafeFields.status >= 100
    && unsafeFields.status <= 599
  ) {
    record.status = unsafeFields.status
  }
  if (typeof unsafeFields.reason === 'string' && REASONS.has(unsafeFields.reason as never)) {
    record.reason = unsafeFields.reason
  }
  if (unsafeFields.phase === 'storage' || unsafeFields.phase === 'database') {
    record.phase = unsafeFields.phase
  }

  console[level](record)
}
