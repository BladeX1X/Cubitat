-- DEV ONLY: historical per-role EXECUTE grants survive REVOKE FROM PUBLIC.
-- Push delivery RPCs expose subscription credentials and must be server-only.
REVOKE ALL ON FUNCTION public.claim_pending_push_deliveries(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_push_deliveries(integer)
  TO service_role;

REVOKE ALL ON FUNCTION public.authorize_push_delivery(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_push_delivery(uuid, integer)
  TO service_role;

-- Admin metrics performs its own AAL2 check, but it is only called by the
-- authenticated admin interface; remove the unnecessary anonymous grant.
REVOKE ALL ON FUNCTION public.get_admin_metrics()
  FROM PUBLIC, anon;
