import {
  checkRateLimit,
  createWorker,
  rateLimitResponse,
  type Env,
  type WorkerExecutionContext,
} from './worker';
import { handleContactMetric } from './worker/contact-metrics';
import { dispatchPendingPushNotifications } from './worker/push-notifications';
import { purgeApprovedKycEvidence } from './worker/kyc-evidence-retention';
import { logWorkerEvent } from './worker/logger';
import { readBoundedJsonObject } from './worker/boundedJson.js';
import {
  authenticateImageHashRequest,
  backfillPropertyImageDuplicates,
  loadOwnedPropertyForImageHashing,
  refreshPropertyImageDuplicates,
} from './worker/image-phash';

export { RateLimiter } from './rate-limiter';

interface ProductionPhaseTwoEnv extends Env {
  CONTACT_METRICS_SALT?: string;
  PHASE2_IMAGE_DUPLICATES_ENABLED?: string;
}

const worker = createWorker({
  additionalPublicRpcs: [
    'get_public_agent_profile',
    'get_verified_agent_ids',
    'get_verified_seller_ids',
  ],
  additionalAuthenticatedRpcs: [
    'submit_kyc_request',
    'review_kyc_request',
    'submit_property_verification',
    'review_property_verification',
    'get_property_trust_score',
    'get_admin_property_image_hash_status',
    'get_admin_property_image_duplicate_candidates',
  ],
});

export function runProductionScheduledTasks(
  env: ProductionPhaseTwoEnv,
  ctx: WorkerExecutionContext,
): void {
  const tasks: Promise<unknown>[] = [dispatchPendingPushNotifications(env), purgeApprovedKycEvidence(env)];
  if (env.PHASE2_IMAGE_DUPLICATES_ENABLED === 'true') {
    tasks.push(backfillPropertyImageDuplicates(env));
  }
  ctx.waitUntil(Promise.all(tasks));
}

export default {
  async fetch(request: Request, env: ProductionPhaseTwoEnv, ctx: WorkerExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/phase2/property-image-duplicates') {
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      };
      const respond = (status: number, body: Record<string, string>) => new Response(JSON.stringify(body), { status, headers });

      if (env.PHASE2_IMAGE_DUPLICATES_ENABLED !== 'true') return respond(404, { error: 'Not found' });
      if (request.method !== 'POST') return respond(405, { error: 'Method not allowed' });
      const parsed = await readBoundedJsonObject(request, 4_096);
      if (!parsed.ok) {
        const message = parsed.status === 413 ? 'Request too large'
          : parsed.status === 408 ? 'Request body timed out'
            : 'Invalid JSON';
        return respond(parsed.status, { error: message });
      }
      const propertyId = parsed.value.property_id;
      if (typeof propertyId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId)) {
        return respond(400, { error: 'Invalid property_id' });
      }

      const userId = await authenticateImageHashRequest(request, env);
      if (!userId) {
        logWorkerEvent('warn', 'image_duplicate_request_failed', { status: 401 });
        return respond(401, { error: 'Unauthorized' });
      }
      const limit = await checkRateLimit(env, `user:${userId}:property-image-duplicates:v1`, 5, 10 * 60 * 1000);
      if (!limit.allowed) return respond(429, { error: 'Too many requests' });

      let property;
      try {
        property = await loadOwnedPropertyForImageHashing(propertyId, userId, env);
      } catch {
        logWorkerEvent('error', 'image_duplicate_request_failed', { status: 503 });
        return respond(503, { error: 'Property lookup unavailable' });
      }
      if (!property) return respond(404, { error: 'Property unavailable' });
      ctx.waitUntil(refreshPropertyImageDuplicates(property, env));
      return respond(202, { accepted: 'true' });
    }

    if (url.pathname === '/api/phase2/contact-click') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'POST' },
        });
      }
      const clientIp = request.headers.get('cf-connecting-ip')
        || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || '127.0.0.1';
      const rateLimit = await checkRateLimit(env, `${clientIp}:phase2-contact-click:v1`, 20, 60_000);
      if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);
      return handleContactMetric(request, env);
    }
    return worker.fetch(request, env, ctx);
  },
  scheduled(_controller: unknown, env: ProductionPhaseTwoEnv, ctx: WorkerExecutionContext) {
    runProductionScheduledTasks(env, ctx);
  },
};
