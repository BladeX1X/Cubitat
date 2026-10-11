import {
  checkRateLimit,
  createWorker,
  rateLimitResponse,
  type Env,
  type WorkerExecutionContext,
} from './worker';
import { dispatchPendingAlertEmails } from './worker/alert-email-dispatcher';
import { handleContactMetric } from './worker/contact-metrics';
import { purgeApprovedKycEvidence } from './worker/kyc-evidence-retention';
import { dispatchPendingPushNotifications } from './worker/push-notifications';
import { logWorkerEvent } from './worker/logger';
import {
  authenticateImageHashRequest,
  backfillPropertyImageDuplicates,
  loadOwnedPropertyForImageHashing,
  refreshPropertyImageDuplicates,
} from './worker/image-phash';

export { RateLimiter } from './rate-limiter';

interface PhaseTwoDevEnv extends Env {
  ALERT_EMAIL_PROVIDER_URL?: string;
  ALERT_EMAIL_FROM?: string;
  CONTACT_METRICS_SALT?: string;
  PUBLIC_SITE_URL?: string;
}

const worker = createWorker({
  additionalPublicRpcs: [
    'get_public_agent_profile',
    'get_verified_agent_ids',
    'get_verified_seller_ids',
  ],
  additionalAuthenticatedRpcs: [
    'get_admin_property_image_hash_status',
    'get_admin_property_image_duplicate_candidates',
    'submit_kyc_request',
    'review_kyc_request',
    'submit_property_verification',
    'review_property_verification',
  ],
});

export function runPhase2ScheduledTasks(
  env: PhaseTwoDevEnv,
  ctx: WorkerExecutionContext,
): void {
  ctx.waitUntil(Promise.all([
    dispatchPendingAlertEmails(env),
    dispatchPendingPushNotifications(env),
    purgeApprovedKycEvidence(env),
    backfillPropertyImageDuplicates(env),
  ]));
}

export default {
  async fetch(request: Request, env: PhaseTwoDevEnv, ctx: WorkerExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/phase2/property-image-duplicates') {
      const responseHeaders = {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      }
      const respond = (status: number, body: Record<string, string>) => new Response(JSON.stringify(body), {
        status,
        headers: responseHeaders,
      })

      if (env.PHASE2_ENABLED !== 'true') return respond(404, { error: 'Not found' })
      if (request.method !== 'POST') return respond(405, { error: 'Method not allowed' })
      const contentLength = Number(request.headers.get('content-length') ?? '0')
      if (contentLength > 4096) return respond(413, { error: 'Request too large' })

      let body: unknown
      try {
        body = await request.json()
      } catch {
        return respond(400, { error: 'Invalid JSON' })
      }
      const propertyId = body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>).property_id
        : null
      if (typeof propertyId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId)) {
        return respond(400, { error: 'Invalid property_id' })
      }

      const userId = await authenticateImageHashRequest(request, env)
      if (!userId) {
        logWorkerEvent('warn', 'image_duplicate_request_failed', { status: 401 })
        return respond(401, { error: 'Unauthorized' })
      }
      const limit = await checkRateLimit(env, `user:${userId}:property-image-duplicates:v1`, 5, 10 * 60 * 1000)
      if (!limit.allowed) {
        logWorkerEvent('warn', 'image_duplicate_request_failed', { status: 429 })
        return respond(429, { error: 'Too many requests' })
      }

      let property
      try {
        property = await loadOwnedPropertyForImageHashing(propertyId, userId, env)
      } catch {
        logWorkerEvent('error', 'image_duplicate_request_failed', { status: 503 })
        return respond(503, { error: 'Property lookup unavailable' })
      }
      if (!property) {
        logWorkerEvent('warn', 'image_duplicate_request_failed', { status: 404 })
        return respond(404, { error: 'Property unavailable' })
      }
      ctx.waitUntil(refreshPropertyImageDuplicates(property, env))
      return respond(202, { accepted: 'true' })
    }

    if (url.pathname === '/api/phase2/contact-click') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'POST' },
        })
      }
      const clientIp = request.headers.get('cf-connecting-ip')
        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || '127.0.0.1'
      const rateLimit = await checkRateLimit(
        env,
        `${clientIp}:phase2-contact-click:v1`,
        20,
        60_000,
      )
      if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt)
      return handleContactMetric(request, env)
    }
    return worker.fetch(request, env, ctx)
  },
  scheduled(
    _controller: { scheduledTime: number; cron: string; noRetry(): void },
    env: PhaseTwoDevEnv,
    ctx: WorkerExecutionContext,
  ): void {
    runPhase2ScheduledTasks(env, ctx);
  },
};
