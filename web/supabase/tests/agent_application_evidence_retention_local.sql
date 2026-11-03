-- Run after intake, review, and evidence-retention migrations in isolated Supabase.
\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(10);

SELECT ok(
  has_column('public', 'agent_applications', 'evidence_purge_last_error_code'),
  'the document purge retains a bounded safe error code'
);
SELECT ok(
  has_column_privilege('authenticated', 'public.agent_applications', 'id', 'SELECT')
    AND NOT has_column_privilege('authenticated', 'public.agent_applications', 'cv_path', 'SELECT')
    AND NOT has_column_privilege('authenticated', 'public.agent_applications', 'diploma_path', 'SELECT'),
  'authenticated application readers cannot retrieve private document paths'
);
SELECT ok(
  pg_get_functiondef('public.claim_agent_application_evidence_for_purge(integer)'::regprocedure) ILIKE '%evidence_delete_after <= now()%'
    AND pg_get_functiondef('public.claim_agent_application_evidence_for_purge(integer)'::regprocedure) ILIKE '%status IN (''approved'', ''rejected'')%',
  'only final decisions become eligible after the retention deadline'
);
SELECT ok(
  pg_get_functiondef('public.claim_agent_application_evidence_for_purge(integer)'::regprocedure) ILIKE '%evidence_purge_attempts < 3%'
    AND pg_get_functiondef('public.claim_agent_application_evidence_for_purge(integer)'::regprocedure) ILIKE '%FOR UPDATE SKIP LOCKED%',
  'document purge claims are bounded and safe under concurrency'
);
SELECT ok(
  pg_get_functiondef('public.claim_agent_application_evidence_for_purge(integer)'::regprocedure) ILIKE '%auth.role() IS DISTINCT FROM ''service_role''%',
  'document purge claim requires service role'
);
SELECT ok(
  has_function_privilege('service_role', 'public.claim_agent_application_evidence_for_purge(integer)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.claim_agent_application_evidence_for_purge(integer)', 'EXECUTE'),
  'only service role can claim documents for purge'
);
SELECT ok(
  has_function_privilege('service_role', 'public.complete_agent_application_evidence_purge(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.complete_agent_application_evidence_purge(uuid)', 'EXECUTE'),
  'only service role can finalize document purge'
);
SELECT ok(
  has_function_privilege('service_role', 'public.release_agent_application_evidence_purge(uuid,text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.release_agent_application_evidence_purge(uuid,text)', 'EXECUTE'),
  'only service role can retry document purge'
);
SELECT ok(
  pg_get_functiondef('public.complete_agent_application_evidence_purge(uuid)'::regprocedure) ILIKE '%cv_path = NULL%'
    AND pg_get_functiondef('public.complete_agent_application_evidence_purge(uuid)'::regprocedure) ILIKE '%diploma_path = NULL%',
  'completed purge clears private object paths from the application row'
);
SELECT ok(
  pg_get_functiondef('public.release_agent_application_evidence_purge(uuid,text)'::regprocedure) ILIKE '%evidence_purge_last_error_code%',
  'failed purge records only a bounded error code for operations'
);

SELECT * FROM finish();
ROLLBACK;
