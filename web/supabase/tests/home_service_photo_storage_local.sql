-- Run after 20261110160000_phase4_home_service_photo_storage.sql and
-- 20261114130000_phase4_home_service_legacy_photo_read.sql in isolated Supabase.
\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(13);

SELECT ok(
  EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'home-service-photos' AND public = false AND file_size_limit = 5242880 AND allowed_mime_types = ARRAY['image/webp']::text[]),
  'service photo bucket is private, WebP-only, and size limited'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'storage.objects'::regclass),
  'Storage objects keeps row-level security enabled'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.home_service_providers'::regclass AND tgname = 'validate_home_service_gallery_references' AND NOT tgisinternal),
  'profile writes validate photo count, owner path, and object existence'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'home_service_photos_owner_upload' AND cmd = 'INSERT'),
  'only an authenticated owner can upload under their own path'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'home_service_photos_public_read' AND roles @> ARRAY['anon']::name[]),
  'anonymous reads require the exact image to be referenced by a published profile'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'home_service_profiles_public_read' AND roles @> ARRAY['anon']::name[]),
  'legacy public reads use the same published-photo guard'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'home_service_profiles_owner_read' AND roles @> ARRAY['authenticated']::name[]),
  'legacy owners retain private reads of their own photos'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'home_service_profiles_admin_aal2_read'),
  'AAL2 admins retain scoped reads of legacy photos'
);
SELECT ok(
  NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname ILIKE 'home_service_profiles%upload%'),
  'legacy bucket remains closed to uploads'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'home_service_photos_owner_read' AND roles @> ARRAY['authenticated']::name[])
    AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'home_service_photos_admin_aal2_read'),
  'owners and AAL2 admins retain scoped reads'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'home_service_photos_owner_delete_unreferenced' AND cmd = 'DELETE'),
  'owners can clean up only unreferenced photos'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.count_owned_home_service_photo_objects(uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.count_owned_home_service_photo_objects(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.validate_home_service_gallery_references()', 'EXECUTE'),
  'photo helper permissions are restricted'
);
SELECT ok(
  has_column_privilege('authenticated', 'public.home_service_providers', 'id', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.home_service_providers', 'INSERT')
    AND NOT has_column_privilege('anon', 'public.home_service_providers', 'id', 'INSERT'),
  'authenticated owners can use stable provider IDs without broadening insert privileges'
);
SELECT * FROM finish();
ROLLBACK;
