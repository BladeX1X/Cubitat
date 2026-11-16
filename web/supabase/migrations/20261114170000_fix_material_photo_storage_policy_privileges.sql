-- Repair previously-applied Materiales Storage policies. Use narrowly scoped
-- SECURITY DEFINER checks because owner_id is intentionally not selectable by
-- anon/authenticated clients.
BEGIN;

CREATE OR REPLACE FUNCTION public.owns_material_photo_listing(p_listing_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.material_listings listing
    WHERE listing.id::text = p_listing_id
      AND listing.owner_id = (SELECT auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION public.owns_material_photo_listing(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_material_photo_listing(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_upload_material_photo(p_listing_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.material_listings listing
    WHERE listing.id::text = p_listing_id
      AND listing.owner_id = (SELECT auth.uid())
      AND listing.status <> 'archived'
  );
$$;
REVOKE ALL ON FUNCTION public.can_upload_material_photo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_upload_material_photo(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.owns_unreferenced_material_photo(
  p_listing_id text, p_object_name text
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.material_listings listing
    WHERE listing.id::text = p_listing_id
      AND listing.owner_id = (SELECT auth.uid())
      AND NOT (p_object_name = ANY(listing.photo_urls))
  );
$$;
REVOKE ALL ON FUNCTION public.owns_unreferenced_material_photo(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_unreferenced_material_photo(text, text) TO authenticated;

-- Keep the already deployed, full-path helper. It owns the format, listing,
-- status and 20-photo checks; only authenticated callers need to invoke it.
REVOKE ALL ON FUNCTION public.can_upload_material_photo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_upload_material_photo(text) TO authenticated;

DROP POLICY IF EXISTS material_photos_owner_upload ON storage.objects;
CREATE POLICY material_photos_owner_upload ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'material-listings'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND storage.filename(name) ~* '^[0-9a-f-]{36}\.(webp|jpe?g|png)$'
  AND public.can_upload_material_photo((storage.foldername(name))[2])
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
  AND public.owns_material_photo_listing((storage.foldername(name))[2])
);

DROP POLICY IF EXISTS material_photos_owner_delete_unreferenced ON storage.objects;
CREATE POLICY material_photos_owner_delete_unreferenced ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'material-listings'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND public.owns_unreferenced_material_photo((storage.foldername(name))[2], name)
);

COMMIT;
