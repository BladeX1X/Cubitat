-- No current caller uses this legacy SECURITY DEFINER RPC. Its historical
-- role-only check bypasses the AAL2 RLS boundary. Retire API access rather
-- than maintaining a second, weaker moderation path.
-- Human moderation continues through admin AAL2 RLS; automation continues
-- through set_property_ai_moderation_trusted, reserved for service_role.
REVOKE ALL ON FUNCTION public.set_property_ai_moderation(uuid, public.property_status, text) FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.set_property_ai_moderation(uuid, public.property_status, text)
IS 'Retired legacy RPC: no API execution permitted. Use admin AAL2 RLS or the server-only trusted moderation RPC.';
