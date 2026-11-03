-- Keep KYC license numbers private; public agent profiles expose verification status only.
BEGIN;

DROP FUNCTION IF EXISTS public.get_public_agent_profile(uuid);

CREATE FUNCTION public.get_public_agent_profile(p_agent_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  phone text,
  agency_name text,
  agency_logo text,
  bio text,
  verification_status text,
  created_at timestamptz,
  active_properties_count bigint,
  reports_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT
    profiles.id,
    COALESCE(NULLIF(btrim(profiles.full_name), ''), 'Anunciante Cubitat'),
    profiles.phone,
    profiles.agency_name,
    profiles.agency_logo,
    profiles.bio,
    profiles.verification_status,
    profiles.created_at,
    COUNT(DISTINCT published.id),
    COUNT(DISTINCT reports.id) FILTER (WHERE reports.status = 'resolved')
  FROM public.profiles
  JOIN public.properties published
    ON published.user_id = profiles.id
   AND published.status = 'published'::public.property_status
  LEFT JOIN public.properties owned ON owned.user_id = profiles.id
  LEFT JOIN public.property_reports reports ON reports.property_id = owned.id
  WHERE profiles.id = p_agent_id
    AND profiles.role = 'agent'::public.user_role
    AND profiles.verification_status = 'verified'
  GROUP BY profiles.id;
$$;

REVOKE ALL ON FUNCTION public.get_public_agent_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_agent_profile(uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
