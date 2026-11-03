-- Run only on an isolated Supabase scratch database after the intake migration.
\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(6);

SELECT ok(
  EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'agent_application_documents' AND public = false AND file_size_limit = 10485760),
  'application documents bucket is private and limited to 10 MiB'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_applications'::regclass),
  'application status table has row level security enabled'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.agent_applications', 'SELECT'),
  'anonymous users cannot read application status'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.agent_applications', 'SELECT'),
  'authenticated users can read status subject to RLS'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.submit_agent_application_trusted(uuid,uuid,text,text,text,text,text)', 'EXECUTE'),
  'anonymous users cannot invoke trusted intake'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.submit_agent_application_trusted(uuid,uuid,text,text,text,text,text)', 'EXECUTE'),
  'authenticated users cannot bypass the Worker to invoke trusted intake'
);

SELECT * FROM finish();
ROLLBACK;
