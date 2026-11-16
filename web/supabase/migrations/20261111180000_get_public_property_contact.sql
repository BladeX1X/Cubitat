-- Publish the phone channel only through the trusted Worker after an explicit
-- contact action. The legacy contact JSON remains private in PostgREST.
CREATE OR REPLACE FUNCTION public.get_public_property_contact(p_property_id uuid)
RETURNS TABLE (phone text, whatsapp text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT details.phone, details.phone
    FROM public.properties AS property
    JOIN public.property_contact_details AS details
      ON details.property_id = property.id
    WHERE property.id = p_property_id
      AND property.status = 'published'::public.property_status
      AND NULLIF(btrim(details.phone), '') IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_property_contact(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_property_contact(uuid)
  TO service_role;
