-- Keep the internal property trust signal working after contact fields moved
-- out of properties.contact_info. The RPC still returns only the presence bit.
CREATE OR REPLACE FUNCTION public.get_property_trust_score(p_property_id uuid)
RETURNS TABLE (
  score integer,
  identity_verified boolean,
  document_verified boolean,
  published boolean,
  contact_present boolean,
  internal_indicator text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT property.user_id
    INTO v_owner_id
  FROM public.properties AS property
  WHERE property.id = p_property_id;

  IF v_owner_id IS NULL
    OR (auth.uid() IS DISTINCT FROM v_owner_id AND NOT public.is_admin_aal2()) THEN
    RAISE EXCEPTION 'Permiso denegado';
  END IF;

  RETURN QUERY
  WITH factors AS (
    SELECT
      (profile.verification_status = 'verified') AS identity_verified,
      EXISTS (
        SELECT 1
        FROM public.property_verification_requests AS request
        WHERE request.property_id = property.id
          AND request.status = 'approved'
      ) AS document_verified,
      (property.status = 'published'::public.property_status) AS published,
      EXISTS (
        SELECT 1
        FROM public.property_contact_details AS contact
        WHERE contact.property_id = property.id
          AND (contact.name IS NOT NULL OR contact.phone IS NOT NULL OR contact.email IS NOT NULL)
      ) AS contact_present
    FROM public.properties AS property
    JOIN public.profiles AS profile ON profile.id = property.user_id
    WHERE property.id = p_property_id
  )
  SELECT
    (CASE WHEN factors.identity_verified THEN 30 ELSE 0 END
      + CASE WHEN factors.document_verified THEN 40 ELSE 0 END
      + CASE WHEN factors.published THEN 20 ELSE 0 END
      + CASE WHEN factors.contact_present THEN 10 ELSE 0 END)::integer,
    factors.identity_verified,
    factors.document_verified,
    factors.published,
    factors.contact_present,
    'internal_indicator_not_legal_certification'::text
  FROM factors;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_property_trust_score(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_property_trust_score(uuid) TO authenticated;
