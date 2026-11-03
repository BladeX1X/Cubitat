-- Public buckets already allow downloads by object URL. Do not expose object
-- metadata listing to anonymous clients through a broad SELECT policy.
DROP POLICY IF EXISTS "Public avatar reads" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
