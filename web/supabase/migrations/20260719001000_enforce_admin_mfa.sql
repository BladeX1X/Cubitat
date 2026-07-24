-- Require an AAL2 session for every administrative data path.

CREATE OR REPLACE FUNCTION public.is_aal2()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
  SELECT coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

REVOKE ALL ON FUNCTION public.is_aal2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_aal2() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin_aal2()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog
AS $$
  SELECT public.is_admin() AND public.is_aal2();
$$;

REVOKE ALL ON FUNCTION public.is_admin_aal2() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_aal2() TO authenticated;

DROP POLICY IF EXISTS "Admin can read all properties" ON public.properties;
CREATE POLICY "Admin can read all properties"
ON public.properties FOR SELECT TO authenticated
USING (public.is_admin_aal2());

DROP POLICY IF EXISTS "Admin can update any property" ON public.properties;
CREATE POLICY "Admin can update any property"
ON public.properties FOR UPDATE TO authenticated
USING (public.is_admin_aal2())
WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "Admin can delete any property" ON public.properties;
CREATE POLICY "Admin can delete any property"
ON public.properties FOR DELETE TO authenticated
USING (public.is_admin_aal2());

DROP POLICY IF EXISTS "Admins can read all reports" ON public.property_reports;
CREATE POLICY "Admins can read all reports"
ON public.property_reports FOR SELECT TO authenticated
USING (public.is_admin_aal2());

DROP POLICY IF EXISTS "Admins can update all reports" ON public.property_reports;
CREATE POLICY "Admins can update all reports"
ON public.property_reports FOR UPDATE TO authenticated
USING (public.is_admin_aal2())
WITH CHECK (public.is_admin_aal2());

DROP POLICY IF EXISTS "Profiles are readable by owner or admin" ON public.profiles;
CREATE POLICY "Profiles are readable by owner or admin"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin_aal2());

DROP POLICY IF EXISTS "Allow read for owners and admins" ON public.contacts;
CREATE POLICY "Allow read for owners and admins"
ON public.contacts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = contacts.property_id
      AND properties.user_id = auth.uid()
  )
  OR public.is_admin_aal2()
);

DROP POLICY IF EXISTS "Admins can read property moderation audit" ON public.property_moderation_audit;
CREATE POLICY "Admins can read property moderation audit"
ON public.property_moderation_audit FOR SELECT TO authenticated
USING (public.is_admin_aal2());

CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  database_bytes bigint;
  storage_bytes bigint;
  properties_count bigint;
  users_count bigint;
  reports_count bigint;
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'Admin AAL2 access required.' USING ERRCODE = '42501';
  END IF;

  SELECT pg_database_size(current_database()) INTO database_bytes;
  SELECT coalesce(sum(coalesce((metadata ->> 'size')::bigint, 0)), 0)::bigint
  INTO storage_bytes
  FROM storage.objects
  WHERE bucket_id = 'property_images';
  SELECT count(*) INTO properties_count FROM public.properties;
  SELECT count(*) INTO users_count FROM public.profiles;
  SELECT count(*) INTO reports_count FROM public.property_reports;

  RETURN jsonb_build_object(
    'db_bytes', database_bytes,
    'storage_bytes', storage_bytes,
    'properties_count', properties_count,
    'users_count', users_count,
    'reports_count', reports_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_metrics() TO authenticated;
