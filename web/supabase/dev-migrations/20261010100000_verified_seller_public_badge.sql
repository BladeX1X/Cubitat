-- Publicly expose only the IDs needed to label published listings whose
-- non-agent owner has completed identity verification. DEV only.
CREATE OR REPLACE FUNCTION public.get_verified_seller_ids()
RETURNS TABLE (id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT profiles.id
  FROM public.profiles
  WHERE profiles.role IN ('buyer'::public.user_role, 'seller'::public.user_role)
    AND profiles.verification_status = 'verified'
    AND EXISTS (
      SELECT 1
      FROM public.properties
      WHERE properties.user_id = profiles.id
        AND properties.status = 'published'::public.property_status
    );
$$;

REVOKE ALL ON FUNCTION public.get_verified_seller_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_verified_seller_ids() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
