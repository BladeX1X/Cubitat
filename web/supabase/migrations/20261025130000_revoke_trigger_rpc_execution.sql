-- Trigger functions run through installed triggers; API roles cannot call them
-- directly as SECURITY DEFINER RPCs.
DO $migration$
DECLARE
  trigger_function record;
BEGIN
  FOR trigger_function IN
    SELECT namespace.nspname, proc.proname
    FROM pg_catalog.pg_proc AS proc
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = proc.pronamespace
    WHERE namespace.nspname = 'public'
      AND proc.prosecdef
      AND proc.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
      AND proc.pronargs = 0
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE ALL ON FUNCTION %I.%I() FROM PUBLIC, anon, authenticated, service_role',
      trigger_function.nspname,
      trigger_function.proname
    );
  END LOOP;
END;
$migration$;

-- `is_admin()` is used by authenticated policies; anonymous callers have no
-- need to query it and are not meant to use the helper as an API RPC.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
