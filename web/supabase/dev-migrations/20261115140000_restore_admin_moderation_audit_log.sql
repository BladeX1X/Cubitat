BEGIN;

-- Restore the admin audit projection missing from DEV without replaying the
-- historical migrations that created or backfilled its source tables.
CREATE OR REPLACE VIEW public.admin_moderation_audit_log
WITH (security_invoker = true)
AS
SELECT
  audit.id::text AS id,
  audit.property_id,
  audit.property_owner_id,
  audit.property_title,
  audit.actor_id,
  audit.actor_role,
  audit.action,
  audit.source,
  audit.provider,
  audit.old_status::text AS old_status,
  audit.new_status::text AS new_status,
  audit.old_moderation_message,
  audit.new_moderation_message,
  audit.changed_fields,
  audit.created_at
FROM public.property_moderation_audit AS audit
UNION ALL
SELECT
  audit.id::text AS id,
  audit.property_id,
  audit.property_owner_id,
  audit.property_title,
  audit.actor_id,
  audit.actor_role,
  audit.action,
  CASE WHEN audit.actor_role = 'owner' THEN 'owner' ELSE 'admin' END AS source,
  NULL::text AS provider,
  audit.old_status,
  audit.new_status,
  NULL::text AS old_moderation_message,
  audit.reason AS new_moderation_message,
  audit.changed_fields,
  audit.created_at
FROM public.property_verification_audit AS audit;

REVOKE ALL ON public.admin_moderation_audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_moderation_audit_log TO authenticated;
REVOKE INSERT, UPDATE, DELETE
  ON public.admin_moderation_audit_log
  FROM PUBLIC, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
