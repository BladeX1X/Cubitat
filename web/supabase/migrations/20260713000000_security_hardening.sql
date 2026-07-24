-- Bound public image uploads, reconcile Storage policy drift and correct
-- the volatility declaration reported by `supabase db lint --linked`.

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/webp']::text[]
WHERE id = 'property_images';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 1048576, ARRAY['image/webp']::text[])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Remove any manually-created policies that mention these two buckets. RLS
-- policies are OR-combined, so leaving one permissive drifted policy in place
-- would bypass the stricter policies below.
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        coalesce(qual, '') ~ '(property_images|avatars)'
        OR coalesce(with_check, '') ~ '(property_images|avatars)'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', policy_record.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Public property image reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property_images');

CREATE POLICY "Owner property image inserts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property_images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owner property image updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property_images'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'property_images'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owner property image deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property_images'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Public avatar reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Owner avatar inserts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owner avatar updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owner avatar deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = auth.uid()::text
);

ALTER FUNCTION public.get_admin_metrics() VOLATILE;
