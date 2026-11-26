# Agent referral codes

## Responsibility

Owns the agent-facing referral-code contract: reading the caller's existing
active code through the owner-scoped RLS policy, provisioning/retrieval through
`ensure_agent_referral_link()`, and construction of the shareable `?ref=` URL.
The server remains responsible for eligibility, uniqueness, and persistence.

## Boundaries

- Does not read leads, contacts, or commissions.
- Initial dashboard loads read the existing active code only; they do not
  provision or reactivate a link.
- Signup-code capture and temporary storage belong to
  `modules/referrals/utils/tracker.ts`; visit attribution remains disabled.
- Worker contact submission and server-side attribution belong to the public
  referral-capture module, which consumes the code format without importing
  agent dashboard queries.
- The dashboard may compose this contract but must not call its RPC directly.

New-account signup attribution is active for email and Google. Email signup
sends the captured code to Auth metadata and the Auth trigger resolves it.
Google OAuth returns to the callback with the code in same-tab session storage;
the callback invokes `attribute_own_oauth_agent_signup(text)`. The server accepts
only a recent Google-created buyer account and resolves the active, verified
agent link. The function is executable only by authenticated sessions and does
not expose ledger rows. Visit-attribution, visit-count, contact-attribution,
and commission RPCs remain revoked.

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
