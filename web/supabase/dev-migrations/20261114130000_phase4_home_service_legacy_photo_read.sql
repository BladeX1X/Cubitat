-- Preserve public viewing of legacy service photos only while referenced by a
-- published provider; retain owner/admin reads for private profile workflows.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_published_home_service_photo(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.home_service_providers AS provider
    WHERE provider.owner_id::text = pg_catalog.split_part(p_path, '/', 1)
      AND provider.status = 'published'
      AND p_path = ANY(provider.gallery_urls)
  );
$function$;

REVOKE ALL ON FUNCTION public.is_published_home_service_photo(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_published_home_service_photo(text)
  TO anon, authenticated;

DROP POLICY IF EXISTS home_service_photos_public_read ON storage.objects;
CREATE POLICY home_service_photos_public_read ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'home-service-photos'
  AND public.is_published_home_service_photo(name)
);

DROP POLICY IF EXISTS home_service_profiles_public_read ON storage.objects;
CREATE POLICY home_service_profiles_public_read ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'home-service-profiles'
  AND public.is_published_home_service_photo(name)
);

DROP POLICY IF EXISTS home_service_profiles_owner_read ON storage.objects;
CREATE POLICY home_service_profiles_owner_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'home-service-profiles'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS home_service_profiles_admin_aal2_read ON storage.objects;
CREATE POLICY home_service_profiles_admin_aal2_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'home-service-profiles'
  AND public.is_admin_aal2()
);

COMMIT;
