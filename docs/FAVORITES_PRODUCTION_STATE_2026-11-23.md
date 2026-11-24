# Favorite persistence state in production — 2026-11-23

Read-only verification through the production session pooler confirmed:

- `public.saved_marketplace_listings` exists.
- Migration versions `20261116100000` and `20261116120000` are recorded.
- `authenticated` has SELECT/INSERT/DELETE; `anon` and `service_role` do not have SELECT.
- Three owner policies exist on the table.

No DDL or DML was executed in this session. The remote migration ledger contains 167 versions, which differs from the 101-version fingerprint enforced by the Phase 3/4 workflow. Do not rerun that 64-migration package or apply the favorites table SQL again until the ledger drift is reconciled. The original UI error is not explained by an absent table; authenticated UI verification remains pending.

The database URI/password was shared in chat and should be rotated; update any direct PostgreSQL connection settings that use it.

## Production Worker correction — 2026-11-23

The UI failure was caused by the production Worker missing `saved_marketplace_listings` in its authenticated write allowlist. Deployed `cubitat1` version `bf754180-1310-4077-905c-65e70dbb0f3c`. Lint, all tests (1,146 passed, 1 skipped), Phase 4 production build, and bundle verifiers passed. Home and `/favoritos` returned HTTP 200. A POST with an intentionally invalid JWT received downstream Supabase 401 rather than Worker 403; no write occurred. Real signed-in save/remove verification remains pending.
