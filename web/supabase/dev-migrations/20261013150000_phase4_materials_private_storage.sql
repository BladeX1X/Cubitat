-- F4-MAT: private image storage. Apply only after an exclusive DEV turn and
-- confirming the DEV schema/history. The production migration chain is separate.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'material-listings', 'material-listings', false, 5242880,
  ARRAY['image/webp', 'image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.validate_material_photo_paths()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_path text;
BEGIN
  IF cardinality(coalesce(NEW.photo_urls, '{}'::text[])) > 10 THEN
    RAISE EXCEPTION 'too_many_material_photos' USING ERRCODE = '22023';
  END IF;

  FOREACH v_path IN ARRAY coalesce(NEW.photo_urls, '{}'::text[]) LOOP
    -- Preserve legacy HTTPS references already on a row, but forbid adding new
    -- external URLs. Those records can be migrated separately without data loss.
    IF TG_OP = 'UPDATE' AND v_path = ANY(OLD.photo_urls) THEN
      CONTINUE;
    END IF;

    IF v_path !~ ('^' || NEW.owner_id::text || '/' || NEW.id::text
      || '/[0-9a-f-]{36}\.(webp|jpe?g|png)$') THEN
      RAISE EXCEPTION 'invalid_material_photo_path' USING ERRCODE = '22023';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM storage.objects object
      WHERE object.bucket_id = 'material-listings'
        AND object.name = v_path
    ) THEN
      RAISE EXCEPTION 'material_photo_object_missing' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_material_photo_paths() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS validate_material_photo_paths ON public.material_listings;
CREATE TRIGGER validate_material_photo_paths
BEFORE INSERT OR UPDATE OF photo_urls, owner_id, id ON public.material_listings
FOR EACH ROW EXECUTE FUNCTION public.validate_material_photo_paths();

CREATE OR REPLACE FUNCTION public.count_owned_material_photo_objects(
  p_owner_id uuid, p_listing_id text
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_owner_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'material_photo_owner_mismatch' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT count(*)::integer FROM storage.objects object
    WHERE object.bucket_id = 'material-listings'
      AND (storage.foldername(object.name))[1] = p_owner_id::text
      AND (storage.foldername(object.name))[2] = p_listing_id
  );
END;
$$;
REVOKE ALL ON FUNCTION public.count_owned_material_photo_objects(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_owned_material_photo_objects(uuid, text) TO authenticated;

DROP POLICY IF EXISTS material_photos_owner_upload ON storage.objects;
CREATE POLICY material_photos_owner_upload ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'material-listings'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND storage.filename(name) ~* '^[0-9a-f-]{36}\.(webp|jpe?g|png)$'
  AND EXISTS (
    SELECT 1 FROM public.material_listings listing
    WHERE listing.id::text = (storage.foldername(name))[2]
      AND listing.owner_id = (SELECT auth.uid())
      AND listing.status <> 'archived'
  )
  AND public.count_owned_material_photo_objects(
    (SELECT auth.uid()), (storage.foldername(name))[2]
  ) < 20
);

DROP POLICY IF EXISTS material_photos_owner_read ON storage.objects;
CREATE POLICY material_photos_owner_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'material-listings'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.material_listings listing
    WHERE listing.id::text = (storage.foldername(name))[2]
      AND listing.owner_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS material_photos_public_read ON storage.objects;
CREATE POLICY material_photos_public_read ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'material-listings'
  AND EXISTS (
    SELECT 1 FROM public.material_listings listing
    WHERE listing.id::text = (storage.foldername(name))[2]
      AND listing.status = 'published'
      AND listing.availability <> 'out_of_stock'
      AND name = ANY(listing.photo_urls)
  )
);

DROP POLICY IF EXISTS material_photos_admin_aal2_read ON storage.objects;
CREATE POLICY material_photos_admin_aal2_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'material-listings'
  AND public.is_admin_aal2()
  AND EXISTS (
    SELECT 1 FROM public.material_listings listing
    WHERE listing.id::text = (storage.foldername(name))[2]
      AND listing.status <> 'archived'
  )
);

DROP POLICY IF EXISTS material_photos_owner_delete_unreferenced ON storage.objects;
CREATE POLICY material_photos_owner_delete_unreferenced ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'material-listings'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND NOT EXISTS (
    SELECT 1 FROM public.material_listings listing
    WHERE listing.id::text = (storage.foldername(name))[2]
      AND listing.owner_id = (SELECT auth.uid())
      AND name = ANY(listing.photo_urls)
  )
);
