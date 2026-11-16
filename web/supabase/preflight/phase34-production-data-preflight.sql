-- Read-only aggregate preflight for the Phase 3/4 release migration review.
-- Run against the target database immediately before selecting an allowlist.
-- This query emits counts/booleans only; never export contact or evidence data.
-- A successful result is evidence for review, not authorization to apply SQL.

SELECT 'verification.missing_submission_audit_events' AS check_name,
       count(*)::bigint AS observed
FROM public.property_verification_requests AS request
WHERE NOT EXISTS (
  SELECT 1
  FROM public.property_verification_audit AS audit
  WHERE audit.request_id = request.id
    AND audit.action = 'document_submitted'
)
UNION ALL
SELECT 'verification.missing_terminal_audit_events', count(*)::bigint
FROM public.property_verification_requests AS request
WHERE request.status IN ('approved', 'rejected')
  AND request.reviewed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.property_verification_audit AS audit
    WHERE audit.request_id = request.id
      AND audit.action = CASE request.status
        WHEN 'approved' THEN 'document_approved'
        ELSE 'document_rejected'
      END
  )
UNION ALL
SELECT 'kyc.eligible_retention_backfill_rows', count(*)::bigint
FROM public.kyc_requests AS request
WHERE request.status IN ('approved', 'rejected')
  AND request.evidence_purge_after IS NULL
  AND request.evidence_purged_at IS NULL
  AND (request.document_path IS NOT NULL OR request.selfie_path IS NOT NULL)
UNION ALL
SELECT 'contacts.property_rows', count(*)::bigint
FROM public.properties
UNION ALL
SELECT 'contacts.sql_null_rows', count(*)::bigint
FROM public.properties
WHERE contact_info IS NULL
UNION ALL
SELECT 'contacts.nonempty_object_rows', count(*)::bigint
FROM public.properties
WHERE jsonb_typeof(contact_info) = 'object'
  AND contact_info <> '{}'::jsonb
UNION ALL
SELECT 'contacts.invalid_json_shape_rows', count(*)::bigint
FROM public.properties
WHERE contact_info IS NOT NULL
  AND jsonb_typeof(contact_info) <> 'object'
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
FROM pg_class AS relation
JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND relation.relname = 'property_contact_details'
  AND relation.relkind IN ('r', 'p')
UNION ALL
SELECT 'storage.property_images_bucket_rows', count(*)::bigint
FROM storage.buckets
WHERE id = 'property_images'
UNION ALL
SELECT 'storage.property_images_bucket_public_rows', count(*)::bigint
FROM storage.buckets
WHERE id = 'property_images'
  AND public
UNION ALL
SELECT 'push.endpoint_owner_rows', count(*)::bigint
FROM public.push_endpoint_owners
UNION ALL
SELECT 'push.registered_at_column_exists', count(*)::bigint
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'push_endpoint_owners'
  AND column_name = 'registered_at'
UNION ALL
SELECT 'push.active_subscription_rows', count(*)::bigint
FROM public.push_subscriptions
ORDER BY check_name;
