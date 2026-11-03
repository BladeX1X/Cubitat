-- Contact metrics are written only through increment_contact_clicks().
-- The Worker needs EXECUTE on that SECURITY DEFINER RPC, not direct access to
-- the deduplication table or its visitor keys.
BEGIN;
REVOKE ALL ON TABLE public.property_contact_clicks FROM service_role;
COMMIT;
