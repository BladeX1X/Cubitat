-- Directory badge RPCs return only public listing-owner IDs, but their public
-- grants let callers bypass Worker request quotas and invoke the database
-- functions directly. Keep execution behind the Worker proxy.
DO $migration$
BEGIN
  IF pg_catalog.to_regprocedure('public.get_verified_agent_ids()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.get_verified_agent_ids() FROM PUBLIC, anon, authenticated, service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_verified_agent_ids() TO service_role';
  END IF;
END;
$migration$;

NOTIFY pgrst, 'reload schema';
