# Agent referral codes

## Responsibility

Owns the agent-facing referral-code contract: provisioning/retrieval through
`ensure_agent_referral_link()` and construction of the shareable `?ref=` URL.
The server remains responsible for eligibility, uniqueness, and persistence.

## Boundaries

- Does not read leads, contacts, or commissions.
- Generic visit attribution remains in `modules/referrals/utils/tracker.ts`.
- Worker contact submission and server-side attribution belong to the public
  referral-capture module, which consumes the code format without importing
  agent dashboard queries.
- The dashboard may compose this contract but must not call its RPC directly.

While Fase 3 referral and commission rules are paused, database privileges revoke direct execution of link, visit-attribution, visit-count, and commission RPCs from API roles. Keep this repository as a prototype only; restore access with a reviewed migration after business approval.

The `ensure_agent_referral_link()` migration also rejects an existing
`active=false` link and never reactivates it with `ON CONFLICT`. Standard and
DEV migration candidates must remain byte-identical when composed over the
same Phase 3 base. The DEV `20261025020000` pause already revokes this RPC;
the new mirror preserves the function-level safeguard for a future canonical
replay. Neither candidate has been applied to the shared local or hosted DB.

## Local verification

Unit coverage checks server RPC usage, response validation, normalization, URL
construction, and malformed-code rejection. DEV persistence/idempotence still
needs verification against the project's Supabase DEV environment.
