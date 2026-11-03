-- Run on a local isolated database after the public profile metric migration.
\set ON_ERROR_STOP on
BEGIN;
SELECT plan(4);

SELECT ok(
  pg_get_function_result('public.get_public_agent_profile(uuid)'::regprocedure)
    NOT ILIKE '%reports_count%',
  'public agent profile omits complaint counts'
);
SELECT ok(
  pg_get_functiondef('public.get_public_agent_profile(uuid)'::regprocedure)
    NOT ILIKE '%property_reports%'
    AND pg_get_functiondef('public.get_public_agent_profile(uuid)'::regprocedure)
      NOT ILIKE '%reports_count%',
  'public agent profile does not query moderation reports'
);
SELECT ok(
  (SELECT proconfig @> ARRAY['search_path=pg_catalog']
   FROM pg_proc WHERE oid = 'public.get_public_agent_profile(uuid)'::regprocedure),
  'public profile SECURITY DEFINER pins its search path'
);
SELECT ok(
  has_function_privilege('anon', 'public.get_public_agent_profile(uuid)', 'EXECUTE')
    AND has_function_privilege('authenticated', 'public.get_public_agent_profile(uuid)', 'EXECUTE')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_proc function
      CROSS JOIN LATERAL aclexplode(coalesce(function.proacl, acldefault('f', function.proowner))) grant_entry
      WHERE function.oid = 'public.get_public_agent_profile(uuid)'::regprocedure
        AND grant_entry.grantee = 0
        AND grant_entry.privilege_type = 'EXECUTE'
    ),
  'only explicitly granted API roles can execute the public profile RPC'
);

SELECT * FROM finish();
ROLLBACK;
