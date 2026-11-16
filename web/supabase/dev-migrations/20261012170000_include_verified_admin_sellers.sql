-- DEV only: include verified admin owners with a published listing in the
-- minimal public seller-badge projection.
CREATE OR REPLACE FUNCTION public.get_verified_seller_ids()
RETURNS TABLE (id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT profiles.id
  FROM public.profiles
  WHERE profiles.role IN (
      'buyer'::public.user_role,
      'seller'::public.user_role,
      'admin'::public.user_role
    )
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

-- Make the new/updated RPC visible immediately to the PostgREST API schema cache.
NOTIFY pgrst, 'reload schema';
