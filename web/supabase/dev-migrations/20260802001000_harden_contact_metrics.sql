-- DEV-F2.7: the browser must not choose the deduplication identity used by
-- contact metrics. Only the Phase 2 Worker may call this RPC with service_role.

REVOKE ALL ON FUNCTION public.increment_contact_clicks(uuid, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_contact_clicks(uuid, text, uuid)
  TO service_role;
