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
  ],
  additionalAuthenticatedRpcs: [
    'submit_kyc_request',
    'review_kyc_request',
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
  ]));
}

export default {
  async fetch(request: Request, env: PhaseTwoDevEnv, ctx: WorkerExecutionContext): Promise<Response> {
    const url = new URL(request.url)
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
