-- Run after the intake, review, and provincial-capacity migrations in isolated Supabase.
\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(10);

SELECT ok(
  to_regclass('public.agent_province_assignments') IS NOT NULL,
  'province assignment ledger exists'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_province_assignments'::regclass),
  'province assignment ledger has row level security enabled'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.agent_province_assignments', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.agent_province_assignments', 'SELECT'),
  'clients cannot inspect province assignment records'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
    AND indexname = 'agent_province_assignments_one_active_agent_idx'
    AND indexdef ILIKE '%UNIQUE%WHERE (released_at IS NULL)%'),
  'an agent cannot occupy two active provincial places'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
    AND indexname = 'agent_province_assignments_one_active_application_idx'
    AND indexdef ILIKE '%UNIQUE%WHERE (released_at IS NULL)%'),
  'an application cannot consume two active provincial places'
);
SELECT ok(
  pg_get_functiondef('public.review_agent_application(uuid,text,text)'::regprocedure) ILIKE '%pg_advisory_xact_lock%'
    AND pg_get_functiondef('public.review_agent_application(uuid,text,text)'::regprocedure) ILIKE '%agent-province:%',
  'province approvals serialize on a transaction-scoped province lock'
);
SELECT ok(
  pg_get_functiondef('public.review_agent_application(uuid,text,text)'::regprocedure) ILIKE '%v_active_count >= 4%'
    AND pg_get_functiondef('public.review_agent_application(uuid,text,text)'::regprocedure) ILIKE '%waitlisted%',
  'a full province places the application on the waitlist'
);
SELECT ok(
  pg_get_functiondef('public.review_agent_application(uuid,text,text)'::regprocedure) ILIKE '%verification_status IS DISTINCT FROM ''verified''%',
  'approval requires verified KYC'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.profiles'::regclass
    AND tgname = 'profiles_require_agent_province_assignment' AND NOT tgisinternal),
  'agent-role activation requires an active province assignment'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.profiles'::regclass
    AND tgname = 'profiles_release_agent_province_assignment' AND NOT tgisinternal),
  'leaving active verified agent status releases the provincial place'
);

SELECT * FROM finish();
ROLLBACK;
