-- Public callers must use the Cloudflare Worker, which applies a per-IP quota.
-- The Worker invokes this narrow RPC using service_role after validating input.
REVOKE EXECUTE ON FUNCTION public.increment_property_view_count(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_property_view_count(uuid)
  TO service_role;

COMMENT ON FUNCTION public.increment_property_view_count(uuid) IS
  'Increments published property views; execution is restricted to the rate-limited Cloudflare Worker service role.';
