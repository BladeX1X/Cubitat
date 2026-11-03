-- Prevent new public objects from silently becoming part of the client Data API.
-- Policies remain mandatory; grants provide the separate object-level boundary.
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Push queue RPCs return private subscription secrets and may mutate delivery state.
REVOKE ALL ON FUNCTION public.claim_pending_push_deliveries(integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.authorize_push_delivery(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_push_deliveries(integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.authorize_push_delivery(uuid, integer)
  TO service_role;

-- Admin metrics are read only by the authenticated admin interface.
REVOKE ALL ON FUNCTION public.get_admin_metrics()
  FROM PUBLIC, anon;

-- This trigger-only helper is not an RPC and needs no API-role EXECUTE grant.
ALTER FUNCTION public.set_search_alerts_updated_at()
  SET search_path = pg_catalog;
REVOKE ALL ON FUNCTION public.set_search_alerts_updated_at()
  FROM PUBLIC, anon, authenticated, service_role;
