-- Keep advertiser contact metrics private while allowing verified agents to
-- see totals for their own property listings in the private dashboard.
CREATE OR REPLACE FUNCTION public.get_own_property_contact_metrics()
RETURNS TABLE (
  property_id uuid,
  phone_clicks_count bigint,
  whatsapp_clicks_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT property.id, property.phone_clicks_count, property.whatsapp_clicks_count
  FROM public.properties AS property
  WHERE property.user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = auth.uid()
        AND profile.role::text IN ('agent', 'admin')
        AND profile.verification_status = 'verified'
    );
$$;

REVOKE ALL ON FUNCTION public.get_own_property_contact_metrics()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_own_property_contact_metrics()
  TO authenticated;
