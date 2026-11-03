-- Public view counts must pass through the IP-limited Worker endpoint.
-- Direct Supabase RPC calls can bypass Cloudflare Worker rate limits.
REVOKE ALL ON FUNCTION public.increment_property_view_count(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_property_view_count(uuid)
  TO service_role;
