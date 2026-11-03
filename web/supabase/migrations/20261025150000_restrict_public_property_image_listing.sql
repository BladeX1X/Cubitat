BEGIN;

-- Public buckets permit downloads by known URL without Storage SELECT policy.
-- Keep that behavior for published ads, but restrict object metadata listing.
DROP POLICY IF EXISTS "Public property image reads" ON storage.objects;
DROP POLICY IF EXISTS "Owner property image reads" ON storage.objects;

CREATE POLICY "Owner property image reads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'property_images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

COMMIT;
