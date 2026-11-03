-- Isolated local database only. Verifies RPC byte caps before text processing.
\set ON_ERROR_STOP on
BEGIN;
SELECT plan(1);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = 'f2620000-0000-0000-0000-000000000001'
  ) THEN
    RAISE EXCEPTION 'Synthetic agent test user already exists.';
  END IF;
END;
$$;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'f2620000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'agent-input-bounds@local.invalid', '',
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Local QA Agent"}', now(), now()
);

-- Seed a verified profile as the test operator instead of bypassing the
-- production KYC trigger. The auth trigger-created buyer profile is temporary.
DELETE FROM public.profiles
WHERE id = 'f2620000-0000-0000-0000-000000000001';
INSERT INTO public.profiles (id, email, role, verification_status)
VALUES (
  'f2620000-0000-0000-0000-000000000001',
  'agent-input-bounds@local.invalid',
  'agent'::public.user_role,
  'verified'
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = 'f2620000-0000-0000-0000-000000000001'
      AND role = 'agent'::public.user_role
      AND verification_status = 'verified'
  ) THEN
    RAISE EXCEPTION 'Synthetic verified agent profile was not created.';
  END IF;
END;
$$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2620000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  args text[][] := ARRAY[
    ARRAY[repeat('x', 33), 'Local Agent', '1234567', NULL, NULL, 'valid interest', NULL, 'true'],
    ARRAY['client', 'Valid Name' || repeat(' ', 471), '1234567', NULL, NULL, 'valid interest', NULL, 'true'],
    ARRAY['client', 'Local Agent', '1234567' || repeat(' ', 58), NULL, NULL, 'valid interest', NULL, 'true'],
    ARRAY['property', 'Local Agent', '1234567', 'House' || repeat(' ', 636), 'Havana', NULL, NULL, 'true'],
    ARRAY['property', 'Local Agent', '1234567', 'House', 'Havana' || repeat(' ', 715), NULL, NULL, 'true'],
    ARRAY['client', 'Local Agent', '1234567', NULL, NULL, 'Job' || repeat(' ', 1998), NULL, 'true'],
    ARRAY['client', 'Local Agent', '1234567', NULL, NULL, 'valid interest', repeat(' ', 4001), 'true']
  ];
  i integer;
BEGIN
  FOR i IN 1..array_length(args, 1) LOOP
    BEGIN
      PERFORM public.create_agent_lead(
        args[i][1], args[i][2], args[i][3], args[i][4],
        args[i][5], args[i][6], args[i][7], args[i][8]::boolean
      );
      RAISE EXCEPTION 'RPC accepted oversized field at case %.', i;
    EXCEPTION WHEN SQLSTATE '22023' THEN
      IF SQLERRM <> 'Invalid agent lead.' THEN
        RAISE;
      END IF;
    END;
  END LOOP;
END;
$$;

RESET ROLE;
SELECT pass('oversized agent lead inputs are rejected');
ROLLBACK;
