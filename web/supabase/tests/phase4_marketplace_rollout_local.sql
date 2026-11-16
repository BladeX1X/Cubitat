-- Run after the complete production migration chain in an isolated Supabase DB.
\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(14);

SELECT ok(
  to_regclass('public.saved_marketplace_listings') IS NOT NULL,
  'service and material favorites table exists'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.saved_marketplace_listings'::regclass),
  'favorites enforce row-level security'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.saved_marketplace_listings', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.saved_marketplace_listings', 'UPDATE'),
  'favorites are private and cannot be reassigned by update'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.saved_marketplace_listings', 'SELECT')
    AND has_table_privilege('authenticated', 'public.saved_marketplace_listings', 'INSERT')
    AND has_table_privilege('authenticated', 'public.saved_marketplace_listings', 'DELETE'),
  'authenticated users can use their favorites'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saved_marketplace_listings' AND policyname = 'saved_marketplace_listings_owner_select' AND qual ILIKE '%auth.uid()%')
    AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saved_marketplace_listings' AND policyname = 'saved_marketplace_listings_owner_insert' AND with_check ILIKE '%auth.uid()%')
    AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saved_marketplace_listings' AND policyname = 'saved_marketplace_listings_owner_delete' AND qual ILIKE '%auth.uid()%'),
  'favorite reads and writes are scoped to the signed-in owner'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.saved_marketplace_listings'::regclass AND conname = 'saved_marketplace_listings_exactly_one_target' AND contype = 'c'),
  'each favorite points to exactly one marketplace listing'
);
SELECT ok(
  to_regclass('public.saved_marketplace_listings_service_unique') IS NOT NULL
    AND to_regclass('public.saved_marketplace_listings_material_unique') IS NOT NULL,
  'duplicate favorites are prevented for services and materials'
);
SELECT ok(
  EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'home-service-photos' AND public = false AND file_size_limit = 5242880 AND allowed_mime_types = ARRAY['image/webp']::text[]),
  'service photo bucket is private, WebP-only, and size limited'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.home_service_providers'::regclass AND tgname = 'validate_home_service_gallery_references' AND NOT tgisinternal),
  'service gallery references are validated before save'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'home_service_photos_owner_upload' AND cmd = 'INSERT' AND roles @> ARRAY['authenticated']::name[] AND with_check ILIKE '%auth.uid()%'),
  'service photo uploads are owner-scoped'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'home_service_photos_public_read' AND cmd = 'SELECT' AND roles @> ARRAY['anon']::name[] AND qual ILIKE '%is_published_home_service_photo%'),
  'public image reads require a published listing reference'
);
SELECT ok(
  has_function_privilege('anon', 'public.is_published_home_service_photo(text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.count_owned_home_service_photo_objects(uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.count_owned_home_service_photo_objects(uuid)', 'EXECUTE'),
  'photo access helpers expose only the intended capabilities'
);
SELECT ok(
  has_column_privilege('authenticated', 'public.home_service_providers', 'id', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.home_service_providers', 'INSERT')
    AND NOT has_column_privilege('anon', 'public.home_service_providers', 'id', 'INSERT'),
  'service publication accepts stable IDs without broadening insert rights'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.resolve_property_report(uuid, uuid)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.resolve_property_report(uuid, uuid)', 'EXECUTE'),
  'report resolution is authenticated and not public'
);

SELECT * FROM finish();
ROLLBACK;
