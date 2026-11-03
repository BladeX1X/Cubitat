BEGIN;

-- A public Storage bucket bypasses object SELECT RLS for downloads by URL.
-- Make property photos private, then grant anonymous reads only for the exact
-- object path referenced by a currently published property.
UPDATE storage.buckets
SET public = false
WHERE id = 'property_images';

-- Remove every prior SELECT policy mentioning this bucket. Permissive policies
-- are OR-combined, so a leftover broad policy would undo the access matrix.
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND coalesce(qual, '') ILIKE '%property_images%'
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', policy_record.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Public published property image reads"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'property_images'
  AND EXISTS (
    SELECT 1
    FROM public.properties p
    WHERE p.status = 'published'::public.property_status
      AND p.user_id::text = (storage.foldername(name))[1]
      AND (
        substring(p.cover_image FROM '/property_images/([^?#]+)') = storage.objects.name
        OR EXISTS (
          SELECT 1
          FROM unnest(coalesce(p.images, ARRAY[]::text[])) AS image_url(value)
          WHERE substring(image_url.value FROM '/property_images/([^?#]+)') = storage.objects.name
        )
      )
  )
);

CREATE POLICY "Owner property image reads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'property_images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

CREATE POLICY "Admins AAL2 read property images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'property_images'
  AND (SELECT public.is_admin_aal2())
);

COMMIT;
