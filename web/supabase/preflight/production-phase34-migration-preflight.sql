-- Production migration gate for the fixed Phase 3/4 promotion set.
-- This query returns labels and aggregate counts only; never emits row values.

WITH property_image_refs AS (
  SELECT p.user_id,
         substring(p.cover_image FROM '/property_images/([^?#]+)') AS object_name
  FROM public.properties p
  WHERE p.cover_image LIKE '%/property_images/%'
  UNION ALL
  SELECT p.user_id,
         substring(image_url.value FROM '/property_images/([^?#]+)')
  FROM public.properties p
  CROSS JOIN LATERAL unnest(COALESCE(p.images, ARRAY[]::text[])) image_url(value)
  WHERE image_url.value LIKE '%/property_images/%'
)
SELECT 'verification.missing_submission_audit_events', count(*)::bigint
FROM public.property_verification_requests request
WHERE NOT EXISTS (
  SELECT 1 FROM public.property_verification_audit audit
  WHERE audit.request_id = request.id AND audit.action = 'document_submitted'
)
UNION ALL
SELECT 'verification.missing_terminal_audit_events', count(*)::bigint
FROM public.property_verification_requests request
WHERE request.status IN ('approved', 'rejected')
  AND request.reviewed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.property_verification_audit audit
    WHERE audit.request_id = request.id
      AND audit.action = CASE request.status
        WHEN 'approved' THEN 'document_approved'
        ELSE 'document_rejected'
      END
  )
UNION ALL
SELECT 'kyc.eligible_retention_backfill_rows', count(*)::bigint
FROM public.kyc_requests request
WHERE request.status IN ('approved', 'rejected')
  AND request.evidence_purge_after IS NULL
  AND request.evidence_purged_at IS NULL
  AND (request.document_path IS NOT NULL OR request.selfie_path IS NOT NULL)
UNION ALL
SELECT 'contacts.property_rows', count(*)::bigint FROM public.properties
UNION ALL
SELECT 'contacts.sql_null_rows', count(*)::bigint
FROM public.properties WHERE contact_info IS NULL
UNION ALL
SELECT 'contacts.nonempty_object_rows', count(*)::bigint
FROM public.properties
WHERE jsonb_typeof(contact_info) = 'object' AND contact_info <> '{}'::jsonb
UNION ALL
SELECT 'contacts.invalid_json_shape_rows', count(*)::bigint
FROM public.properties
WHERE contact_info IS NOT NULL AND jsonb_typeof(contact_info) <> 'object'
UNION ALL
SELECT 'contacts.unmapped_key_rows', count(*)::bigint
FROM public.properties
WHERE jsonb_typeof(contact_info) = 'object'
  AND (contact_info - ARRAY['name', 'phone', 'email']::text[]) <> '{}'::jsonb
UNION ALL
SELECT 'contacts.non_text_field_rows', count(*)::bigint
FROM public.properties
WHERE (contact_info ? 'name' AND jsonb_typeof(contact_info->'name') NOT IN ('string', 'null'))
   OR (contact_info ? 'phone' AND jsonb_typeof(contact_info->'phone') NOT IN ('string', 'null'))
   OR (contact_info ? 'email' AND jsonb_typeof(contact_info->'email') NOT IN ('string', 'null'))
UNION ALL
SELECT 'contacts.over_limit_field_rows', count(*)::bigint
FROM public.properties
WHERE octet_length(btrim(contact_info->>'name')) > 480
   OR octet_length(btrim(contact_info->>'phone')) > 64
   OR octet_length(btrim(contact_info->>'email')) > 1020
UNION ALL
SELECT 'contacts.destination_table_exists', count(*)::bigint
FROM pg_class relation
JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public' AND relation.relname = 'property_contact_details'
  AND relation.relkind IN ('r', 'p')
UNION ALL
SELECT 'storage.property_images_bucket_rows', count(*)::bigint
FROM storage.buckets WHERE id = 'property_images'
UNION ALL
SELECT 'storage.property_images_bucket_public_rows', count(*)::bigint
FROM storage.buckets WHERE id = 'property_images' AND public
UNION ALL
SELECT 'storage.property_image_objects_total', count(*)::bigint
FROM storage.objects WHERE bucket_id = 'property_images'
UNION ALL
SELECT 'storage.property_image_objects_without_auth_owner', count(*)::bigint
FROM storage.objects object
WHERE object.bucket_id = 'property_images'
  AND NOT EXISTS (
    SELECT 1 FROM auth.users owner
    WHERE owner.id::text = (storage.foldername(object.name))[1]
  )
UNION ALL
SELECT 'storage.property_image_refs_total', count(*)::bigint FROM property_image_refs
UNION ALL
SELECT 'storage.property_image_refs_missing_objects', count(*)::bigint
FROM property_image_refs reference
WHERE NOT EXISTS (
  SELECT 1 FROM storage.objects object
  WHERE object.bucket_id = 'property_images' AND object.name = reference.object_name
)
UNION ALL
SELECT 'storage.property_image_refs_owner_mismatches', count(*)::bigint
FROM property_image_refs reference
JOIN storage.objects object
  ON object.bucket_id = 'property_images' AND object.name = reference.object_name
WHERE (storage.foldername(object.name))[1] <> reference.user_id::text
UNION ALL
SELECT 'push.endpoint_owner_rows', count(*)::bigint FROM public.push_endpoint_owners
UNION ALL
SELECT 'push.registered_at_column_exists', count(*)::bigint
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'push_endpoint_owners'
  AND column_name = 'registered_at'
UNION ALL
SELECT 'push.active_subscription_rows', count(*)::bigint FROM public.push_subscriptions
UNION ALL
SELECT 'core.property_verification_audit_exists', (to_regclass('public.property_verification_audit') IS NOT NULL)::int
UNION ALL
SELECT 'core.contact_table_absent', (to_regclass('public.property_contact_details') IS NULL)::int
UNION ALL
SELECT 'core.saved_marketplace_table_absent', (to_regclass('public.saved_marketplace_listings') IS NULL)::int
UNION ALL
SELECT 'core.public_contact_rpc_absent', (to_regprocedure('public.get_public_property_contact(uuid)') IS NULL)::int
UNION ALL
SELECT 'core.report_resolution_rpc_absent', (to_regprocedure('public.resolve_property_report(uuid,uuid)') IS NULL)::int
UNION ALL
SELECT 'core.home_service_photo_bucket_absent', count(*)::bigint
FROM storage.buckets WHERE id = 'home-service-photos'
ORDER BY 1;
