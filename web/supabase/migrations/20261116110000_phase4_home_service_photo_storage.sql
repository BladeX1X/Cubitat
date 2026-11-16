-- Private WebP gallery storage for home-service listings. Public reads are
-- limited to images referenced by currently published service listings.
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('home-service-photos', 'home-service-photos', false, 5242880, ARRAY['image/webp']::text[])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.is_published_home_service_photo(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.home_service_providers AS provider
    WHERE provider.owner_id::text = pg_catalog.split_part(p_path, '/', 1)
      AND provider.status = 'published'
      AND p_path = ANY(provider.gallery_urls)
  );
$$;
REVOKE ALL ON FUNCTION public.is_published_home_service_photo(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_published_home_service_photo(text)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_home_service_gallery_references()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_reference text;
BEGIN
  IF cardinality(coalesce(NEW.gallery_urls, '{}')) > 10 THEN
    RAISE EXCEPTION 'too_many_home_service_photos' USING ERRCODE = '22023';
  END IF;

  FOREACH v_reference IN ARRAY coalesce(NEW.gallery_urls, '{}') LOOP
    IF TG_OP = 'UPDATE' AND v_reference = ANY(OLD.gallery_urls) THEN
      CONTINUE;
    END IF;
    IF v_reference ~ '^https://[^[:space:]]+$' THEN
      CONTINUE;
    END IF;
    IF v_reference !~ ('^' || NEW.owner_id::text || '/[0-9a-f-]{36}\.webp$') THEN
      RAISE EXCEPTION 'invalid_home_service_photo_path' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM storage.objects object
      WHERE object.bucket_id = 'home-service-photos' AND object.name = v_reference
    ) THEN
      RAISE EXCEPTION 'home_service_photo_object_missing' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_home_service_gallery_references()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS validate_home_service_gallery_references
  ON public.home_service_providers;
CREATE TRIGGER validate_home_service_gallery_references
BEFORE INSERT OR UPDATE OF gallery_urls, owner_id, id
ON public.home_service_providers
FOR EACH ROW EXECUTE FUNCTION public.validate_home_service_gallery_references();

CREATE OR REPLACE FUNCTION public.count_owned_home_service_photo_objects(p_owner_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_owner_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'home_service_photo_owner_mismatch' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT count(*)::integer FROM storage.objects object
    WHERE object.bucket_id = 'home-service-photos'
      AND (storage.foldername(object.name))[1] = p_owner_id::text
  );
END;
$$;
REVOKE ALL ON FUNCTION public.count_owned_home_service_photo_objects(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_owned_home_service_photo_objects(uuid)
  TO authenticated;

DROP POLICY IF EXISTS home_service_photos_owner_upload ON storage.objects;
CREATE POLICY home_service_photos_owner_upload ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'home-service-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND storage.filename(name) ~* '^[0-9a-f-]{36}\.webp$'
  AND public.count_owned_home_service_photo_objects((SELECT auth.uid())) < 200
);

DROP POLICY IF EXISTS home_service_photos_owner_read ON storage.objects;
CREATE POLICY home_service_photos_owner_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'home-service-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS home_service_photos_public_read ON storage.objects;
CREATE POLICY home_service_photos_public_read ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'home-service-photos'
  AND public.is_published_home_service_photo(name)
);

DROP POLICY IF EXISTS home_service_photos_admin_aal2_read ON storage.objects;
CREATE POLICY home_service_photos_admin_aal2_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'home-service-photos'
  AND public.is_admin_aal2()
);

DROP POLICY IF EXISTS home_service_photos_owner_delete_unreferenced ON storage.objects;
CREATE POLICY home_service_photos_owner_delete_unreferenced ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'home-service-photos'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND NOT EXISTS (
    SELECT 1 FROM public.home_service_providers provider
    WHERE name = ANY(provider.gallery_urls)
  )
);

COMMIT;
