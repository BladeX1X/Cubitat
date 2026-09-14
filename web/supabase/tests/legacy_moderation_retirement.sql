-- Run only against an isolated local stack after the production migrations.
BEGIN;
DO $$
DECLARE
  caller text;
  signature text := 'public.set_property_ai_moderation(uuid,public.property_status,text)';
BEGIN
  FOREACH caller IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF has_function_privilege(caller, signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Legacy moderation RPC still executable by %', caller;
    END IF;
  END LOOP;
  IF NOT has_function_privilege('service_role',
    'public.set_property_ai_moderation_trusted(uuid,public.property_status,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Trusted automation privilege was lost';
  END IF;
  IF has_function_privilege('authenticated',
    'public.set_property_ai_moderation_trusted(uuid,public.property_status,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Trusted automation exposed to clients';
  END IF;
END;
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","aal":"aal1"}', true);
DO $$
BEGIN
  PERFORM public.set_property_ai_moderation('00000000-0000-0000-0000-000000000001', 'ai_approved', NULL);
  RAISE EXCEPTION 'AAL1 legacy call unexpectedly succeeded';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$$;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","aal":"aal2"}', true);
DO $$
BEGIN
  PERFORM public.set_property_ai_moderation('00000000-0000-0000-0000-000000000001', 'ai_approved', NULL);
  RAISE EXCEPTION 'AAL2 legacy call unexpectedly succeeded';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$$;
RESET ROLE;
SELECT 'legacy_moderation_retirement: ok' AS result;
ROLLBACK;
