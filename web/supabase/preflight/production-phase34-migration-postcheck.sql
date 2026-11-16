-- Production postconditions for the fixed Phase 3/4 promotion set.
-- Aggregate values only; never emits contact details or user identifiers.
WITH checks AS (
  SELECT 'ledger.release_migrations' AS check_name,
         count(*)::bigint AS check_value
  FROM supabase_migrations.schema_migrations
  WHERE version IN (
    '20260930170000','20261022140000','20261023170000','20261023190000',
    '20261023200000','20261024120000','20261024130000','20261024140000',
    '20261024150000','20261024170000','20261024180000','20261024220000',
    '20261024230000','20261024235000','20261024235950','20261024235955',
    '20261024235957','20261024235958','20261024235959','20261025000000',
    '20261025030000','20261025040000','20261025050000','20261025060000',
    '20261025070000','20261025100000','20261025110000','20261025120000',
    '20261025130000','20261025150000','20261025160000','20261025170000',
    '20261025180000','20261025190000','20261025200000','20261025230000',
    '20261025235900','20261025250000','20261026210000','20261026220000',
    '20261026231000','20261026232000','20261026233000','20261026234000',
    '20261027120000','20261027223000','20261028170000','20261028180000',
    '20261028190000','20261028200000','20261029100000','20261029120000',
    '20261029130000','20261029140000','20261030100000','20261030150000',
    '20261030160000','20261111180000','20261114170000','20261115120000',
    '20261115130000','20261116100000','20261116110000','20261116120000'
  )
  UNION ALL
  SELECT 'contacts.legacy_nonempty_rows', count(*)::bigint
  FROM public.properties WHERE contact_info <> '{}'::jsonb
  UNION ALL
  SELECT 'contacts.private_rows', count(*)::bigint
  FROM public.property_contact_details
  UNION ALL
  SELECT 'audit.missing_submission_events', count(*)::bigint
  FROM public.property_verification_requests request
  WHERE NOT EXISTS (
    SELECT 1 FROM public.property_verification_audit audit
    WHERE audit.request_id = request.id AND audit.action = 'document_submitted'
  )
  UNION ALL
  SELECT 'audit.missing_terminal_events', count(*)::bigint
  FROM public.property_verification_requests request
  WHERE request.status IN ('approved','rejected') AND request.reviewed_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.property_verification_audit audit
      WHERE audit.request_id = request.id
        AND audit.action = CASE request.status WHEN 'approved' THEN 'document_approved'
          ELSE 'document_rejected' END
    )
  UNION ALL
  SELECT 'kyc.eligible_retention_rows', count(*)::bigint
  FROM public.kyc_requests
  WHERE status IN ('approved','rejected') AND evidence_purge_after IS NULL
    AND evidence_purged_at IS NULL
    AND (document_path IS NOT NULL OR selfie_path IS NOT NULL)
  UNION ALL
  SELECT 'push.registered_at_null_rows', count(*)::bigint
  FROM public.push_endpoint_owners WHERE registered_at IS NULL
  UNION ALL
  SELECT 'storage.property_bucket_private', count(*)::bigint
  FROM storage.buckets WHERE id = 'property_images' AND NOT public
  UNION ALL
  SELECT 'storage.service_bucket_private', count(*)::bigint
  FROM storage.buckets WHERE id = 'home-service-photos' AND NOT public
  UNION ALL
  SELECT 'schema.private_contact_table', (to_regclass('public.property_contact_details') IS NOT NULL)::int
  UNION ALL
  SELECT 'schema.public_contact_rpc', (to_regprocedure('public.get_public_property_contact(uuid)') IS NOT NULL)::int
  UNION ALL
  SELECT 'schema.report_resolution_rpc', (to_regprocedure('public.resolve_property_report(uuid,uuid)') IS NOT NULL)::int
  UNION ALL
  SELECT 'schema.saved_listings_table', (to_regclass('public.saved_marketplace_listings') IS NOT NULL)::int
  UNION ALL
  SELECT 'schema.service_photos_bucket', (to_regclass('storage.buckets') IS NOT NULL AND EXISTS (SELECT 1 FROM storage.buckets WHERE id='home-service-photos'))::int
  UNION ALL
  SELECT 'policy.saved_listings_count', count(*)::bigint
  FROM pg_policy WHERE polrelid = to_regclass('public.saved_marketplace_listings')
  UNION ALL
  SELECT 'policy.service_photos_count', count(*)::bigint
  FROM pg_policy WHERE polrelid = to_regclass('storage.objects')
    AND polname LIKE '%home_service%'
  UNION ALL
  SELECT 'privilege.anon_private_contact_select', has_table_privilege('anon','public.property_contact_details','SELECT')::int
  UNION ALL
  SELECT 'privilege.anon_saved_listing_select', has_table_privilege('anon','public.saved_marketplace_listings','SELECT')::int
  UNION ALL
  SELECT 'privilege.auth_saved_listing_select', has_table_privilege('authenticated','public.saved_marketplace_listings','SELECT')::int
  UNION ALL
  SELECT 'privilege.anon_property_contact_rpc', has_function_privilege('anon','public.get_public_property_contact(uuid)','EXECUTE')::int
  UNION ALL
  SELECT 'privilege.service_property_contact_rpc', has_function_privilege('service_role','public.get_public_property_contact(uuid)','EXECUTE')::int
)
SELECT check_name, check_value FROM checks ORDER BY check_name;
