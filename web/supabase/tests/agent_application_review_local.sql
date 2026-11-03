-- Run only on an isolated Supabase scratch database after intake and review migrations.
\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(12);

SELECT has_function('public', 'review_agent_application', ARRAY['uuid', 'text', 'text'], 'AAL2 review action RPC exists');
SELECT ok(
  has_function_privilege('authenticated', 'public.review_agent_application(uuid,text,text)', 'EXECUTE'),
  'authenticated role can call the RPC, which enforces AAL2 internally'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.review_agent_application(uuid,text,text)', 'EXECUTE'),
  'anonymous role cannot call the review RPC'
);
SELECT ok(
  NOT has_function_privilege('service_role', 'public.review_agent_application(uuid,text,text)', 'EXECUTE'),
  'service role cannot bypass audited human review'
);
SELECT ok(
  (SELECT prosecdef FROM pg_proc WHERE oid = 'public.review_agent_application(uuid,text,text)'::regprocedure),
  'review RPC runs as a security definer'
);
SELECT ok(
  (SELECT proconfig @> ARRAY['search_path=pg_catalog'] FROM pg_proc WHERE oid = 'public.review_agent_application(uuid,text,text)'::regprocedure),
  'review RPC pins its search path'
);
SELECT ok(
  pg_get_functiondef('public.review_agent_application(uuid,text,text)'::regprocedure) ILIKE '%is_admin_aal2%',
  'review RPC requires admin AAL2 in the database'
);
SELECT ok(
  pg_get_functiondef('public.review_agent_application(uuid,text,text)'::regprocedure) ILIKE '%v_now + interval ''30 days''%',
  'rejection schedules evidence deletion 30 days after the final decision'
);
SELECT ok(
  pg_get_functiondef('public.review_agent_application(uuid,text,text)'::regprocedure) NOT ILIKE '%approved%',
  'approval is blocked until province capacity can be assigned transactionally'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.agent_application_events'::regclass
      AND tgname = 'agent_application_events_immutable'
      AND NOT tgisinternal
  ),
  'review actions are written to immutable application events'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_application_events'::regclass),
  'application event history has row level security enabled'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.agent_application_events', 'SELECT'),
  'authenticated review history remains readable only subject to its AAL2 RLS policy'
);

SELECT * FROM finish();
ROLLBACK;
