-- Run on an isolated database after the agent application intake/outbox migrations.
\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(10);

SELECT ok(
  to_regclass('public.agent_application_email_outbox') IS NOT NULL,
  'application email queue exists'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.agent_application_email_outbox'::regclass),
  'application email queue has row level security enabled'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.agent_application_email_outbox', 'SELECT'),
  'anonymous users cannot read application email queue'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.agent_application_email_outbox', 'SELECT'),
  'authenticated users cannot read application email queue'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.agent_applications'::regclass
      AND tgname = 'queue_agent_application_email'
      AND NOT tgisinternal
  ),
  'new applications atomically enqueue one notification'
);
SELECT ok(
  has_function_privilege('service_role', 'public.claim_pending_agent_application_emails(integer)', 'EXECUTE'),
  'service role can claim email work'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.claim_pending_agent_application_emails(integer)', 'EXECUTE'),
  'anonymous users cannot claim email work'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.claim_pending_agent_application_emails(integer)', 'EXECUTE'),
  'authenticated users cannot claim email work'
);
SELECT ok(
  has_function_privilege('service_role', 'public.complete_agent_application_email(uuid)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.complete_agent_application_email(uuid)', 'EXECUTE'),
  'only the service role can complete email work'
);
SELECT ok(
  has_function_privilege('service_role', 'public.release_agent_application_email(uuid,text)', 'EXECUTE')
    AND NOT has_function_privilege('authenticated', 'public.release_agent_application_email(uuid,text)', 'EXECUTE'),
  'only the service role can retry or fail email work'
);

SELECT * FROM finish();
ROLLBACK;
