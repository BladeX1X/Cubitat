-- Run after the F3 province capacity migration in an isolated Supabase database.
\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(14);

SELECT has_table('public', 'agent_role_moderation_events', 'agent role revocation audit table exists');
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_role_moderation_events'::regclass),
  'revocation audit table has RLS enabled'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.agent_role_moderation_events', 'SELECT')
    AND has_table_privilege('authenticated', 'public.agent_role_moderation_events', 'SELECT'),
  'audit reads require authenticated session and AAL2 RLS'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.agent_role_moderation_events'::regclass
    AND tgname = 'agent_role_moderation_events_immutable' AND NOT tgisinternal),
  'revocation audit events are immutable'
);
SELECT has_function('public', 'list_active_agents_for_moderation', ARRAY[]::text[], 'AAL2 active-agent list RPC exists');
SELECT has_function('public', 'revoke_agent_access', ARRAY['uuid', 'text'], 'agent access revocation RPC exists');
SELECT ok(
  pg_get_functiondef('public.list_active_agents_for_moderation()'::regprocedure) ILIKE '%LEFT JOIN public.agent_province_assignments%'
    AND pg_get_functiondef('public.list_active_agents_for_moderation()'::regprocedure) ILIKE '%profile.role = ''agent''%',
  'active-agent list includes legacy agents even without a provincial assignment and excludes admins'
);
SELECT ok(
  pg_get_functiondef('public.revoke_agent_access(uuid,text)'::regprocedure) ILIKE '%role IS DISTINCT FROM ''agent''%'
    AND pg_get_functiondef('public.revoke_agent_access(uuid,text)'::regprocedure) ILIKE '%SET role = ''buyer''%'
    AND NOT pg_get_functiondef('public.revoke_agent_access(uuid,text)'::regprocedure) ILIKE '%DELETE FROM public.profiles%',
  'revocation can target only agent role profiles, never admin role accounts'
);
SELECT ok(has_function_privilege('authenticated', 'public.list_active_agents_for_moderation()', 'EXECUTE'), 'authenticated can call the guarded agent list RPC');
SELECT ok(NOT has_function_privilege('anon', 'public.list_active_agents_for_moderation()', 'EXECUTE'), 'anonymous cannot list agents');
SELECT ok(NOT has_function_privilege('service_role', 'public.list_active_agents_for_moderation()', 'EXECUTE'), 'service role cannot list agents through moderator RPC');
SELECT ok(has_function_privilege('authenticated', 'public.revoke_agent_access(uuid,text)', 'EXECUTE'), 'authenticated can call the guarded revoke RPC');
SELECT ok(NOT has_function_privilege('anon', 'public.revoke_agent_access(uuid,text)', 'EXECUTE'), 'anonymous cannot revoke agents');
SELECT ok(NOT has_function_privilege('service_role', 'public.revoke_agent_access(uuid,text)', 'EXECUTE'), 'service role cannot bypass moderator revocation');
SELECT ok(
  (SELECT prosecdef AND proconfig @> ARRAY['search_path=pg_catalog'] FROM pg_proc
   WHERE oid = 'public.revoke_agent_access(uuid,text)'::regprocedure)
    AND pg_get_functiondef('public.revoke_agent_access(uuid,text)'::regprocedure) ILIKE '%is_admin_aal2%'
    AND pg_get_functiondef('public.revoke_agent_access(uuid,text)'::regprocedure) ILIKE '%char_length(v_reason) NOT BETWEEN 3 AND 500%'
    AND pg_get_functiondef('public.revoke_agent_access(uuid,text)'::regprocedure) ILIKE '%agent_role_moderation_events%'
    AND pg_get_functiondef('public.revoke_agent_access(uuid,text)'::regprocedure) ILIKE '%released_at = now()%'
    AND pg_get_functiondef('public.revoke_agent_access(uuid,text)'::regprocedure) ILIKE '%buyer%'
    AND NOT pg_get_functiondef('public.revoke_agent_access(uuid,text)'::regprocedure) ILIKE '%DELETE FROM public.profiles%',
  'revocation requires AAL2 and a reason, audits the decision, releases the slot and preserves the user account'
);

SELECT * FROM finish();
ROLLBACK;
