BEGIN;

-- The audit view is read-only for application users. Keep the admin UI's
-- authenticated SELECT grant, but remove inherited DML grants on the view.
REVOKE INSERT, UPDATE, DELETE
ON public.admin_moderation_audit_log
FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
