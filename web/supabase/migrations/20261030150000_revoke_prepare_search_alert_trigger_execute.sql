-- Trigger-only handler; clients must not invoke it directly as an RPC.
-- The historic email-delivery migration is present in DEV's schema but its
-- trigger-function ACL drifted from the checked-in migration.
BEGIN;

REVOKE ALL ON FUNCTION public.prepare_search_alert_email()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.prepare_search_alert_email() IS
  'Internal trigger handler for search-alert email delivery; not an API function.';

COMMIT;
