-- Keep the SECURITY INVOKER audit projection read-only for API roles.
-- Default privileges had granted mutation ACLs to authenticated despite the
-- earlier SELECT grant; REVOKE removes the inherited excess privileges.
REVOKE ALL ON public.admin_moderation_audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_moderation_audit_log TO authenticated;
NOTIFY pgrst, 'reload schema';
