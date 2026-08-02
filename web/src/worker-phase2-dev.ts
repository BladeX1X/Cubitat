import { createWorker, type Env } from './worker';
import { dispatchPendingAlertEmails } from './worker/alert-email-dispatcher';
import { purgeApprovedKycEvidence } from './worker/kyc-evidence-retention';

export { RateLimiter } from './rate-limiter';

interface PhaseTwoDevEnv extends Env {
  ALERT_EMAIL_PROVIDER_URL?: string;
  ALERT_EMAIL_FROM?: string;
  PUBLIC_SITE_URL?: string;
}

const worker = createWorker({
  additionalPublicRpcs: [
    'get_public_agent_profile',
    'get_verified_agent_ids',
    'increment_contact_clicks',
  ],
  additionalAuthenticatedRpcs: [
    'submit_kyc_request',
    'review_kyc_request',
  ],
});

export default {
  fetch: worker.fetch,
  scheduled(
    _controller: unknown,
    env: PhaseTwoDevEnv,
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ): void {
    ctx.waitUntil(Promise.all([
      dispatchPendingAlertEmails(env),
      purgeApprovedKycEvidence(env),
    ]));
  },
};
