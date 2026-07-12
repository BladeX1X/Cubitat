-- Admin-only operational metrics without exposing underlying rows.

CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
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
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required.' USING ERRCODE = '42501';
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
