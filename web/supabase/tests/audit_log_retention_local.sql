\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ASSERTION FAILED: %', message;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_raises(statement text, expected_message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%' || expected_message || '%' THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'ASSERTION FAILED: expected error containing "%", got "%"', expected_message, SQLERRM;
  END;

  RAISE EXCEPTION 'ASSERTION FAILED: statement succeeded; expected error containing "%"', expected_message;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.assert_no_purge_job()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  scheduled_count bigint := 0;
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE
      'SELECT count(*) FROM cron.job WHERE command ILIKE ''%purge_auth_audit_log_entries%'''
      INTO scheduled_count;
  END IF;

  IF scheduled_count <> 0 THEN
    RAISE EXCEPTION 'ASSERTION FAILED: no automatic audit purge job may exist';
  END IF;
END;
$$;

CREATE TEMP TABLE baseline_preview AS
SELECT * FROM public.preview_auth_audit_retention();

INSERT INTO auth.audit_log_entries (instance_id, id, payload, created_at, ip_address)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'f4000000-0000-0000-0000-000000000001',
    '{"action":"local_retention_eligible"}',
    '2000-01-01 00:00:00+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f4000000-0000-0000-0000-000000000002',
    '{"action":"local_retention_held"}',
    '2000-01-02 00:00:00+00',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f4000000-0000-0000-0000-000000000003',
    '{"action":"local_retention_recent"}',
    now(),
    ''
  );

INSERT INTO public.auth_audit_retention_holds (
  starts_at,
  ends_at,
  reason_code,
  review_after
)
VALUES (
  '2000-01-01 12:00:00+00',
  '2000-01-02 12:00:00+00',
  'security_incident',
  current_date + 30
);

SELECT pg_temp.assert_true(
  (
    SELECT current_preview.eligible_count = baseline_preview.eligible_count + 1
    FROM public.preview_auth_audit_retention() AS current_preview
    CROSS JOIN baseline_preview
  ),
  'preview must count the old eligible row while excluding held and recent rows'
);

SET LOCAL ROLE anon;
SELECT pg_temp.assert_raises(
  'SELECT * FROM public.preview_auth_audit_retention()',
  'permission denied'
);
SELECT pg_temp.assert_raises(
  'SELECT * FROM public.purge_auth_audit_log_entries(500, true)',
  'permission denied'
);
SELECT pg_temp.assert_raises(
  'SELECT * FROM public.auth_audit_retention_holds',
  'permission denied'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_raises(
  'SELECT * FROM public.preview_auth_audit_retention()',
  'permission denied'
);
SELECT pg_temp.assert_raises(
  'SELECT * FROM public.purge_auth_audit_log_entries(500, true)',
  'permission denied'
);
RESET ROLE;

CREATE TEMP TABLE dry_run_result (
  cutoff_at timestamptz,
  eligible_count bigint,
  deleted_count bigint
) ON COMMIT DROP;
GRANT SELECT, INSERT ON dry_run_result TO service_role;

SET LOCAL ROLE service_role;
INSERT INTO dry_run_result
SELECT * FROM public.purge_auth_audit_log_entries();
SELECT pg_temp.assert_raises(
  'SELECT * FROM public.purge_auth_audit_log_entries(0, true)',
  'batch size must be between 1 and 1000'
);
RESET ROLE;

SELECT pg_temp.assert_true(
  (SELECT deleted_count = 0 FROM dry_run_result),
  'default purge invocation must remain a dry run'
);
SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 3
    FROM auth.audit_log_entries
    WHERE id IN (
      'f4000000-0000-0000-0000-000000000001',
      'f4000000-0000-0000-0000-000000000002',
      'f4000000-0000-0000-0000-000000000003'
    )
  ),
  'dry run must preserve every synthetic audit row'
);
SELECT pg_temp.assert_no_purge_job();

ROLLBACK;

SELECT 'audit_log_retention_local: ok' AS result;
