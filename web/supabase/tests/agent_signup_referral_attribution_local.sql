-- Run after all migrations in an isolated local Supabase database.
\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(11);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id IN (
      'f3110317-0000-0000-0000-000000000001',
      'f3110317-0000-0000-0000-000000000002',
      'f3110317-0000-0000-0000-000000000003',
      'f3110317-0000-0000-0000-000000000004',
      'f3110317-0000-0000-0000-000000000005',
      'f3110317-0000-0000-0000-000000000006',
      'f3110317-0000-0000-0000-000000000007'
    )
  ) THEN
    RAISE EXCEPTION 'Synthetic signup attribution test users already exist.';
  END IF;
END;
$$;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'f3110317-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'signup-agent-active@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Active Agent"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f3110317-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'signup-agent-paused@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Paused Agent"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f3110317-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'signup-agent-unverified@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Unverified Agent"}', now(), now());

DELETE FROM public.profiles
WHERE id IN (
  'f3110317-0000-0000-0000-000000000001',
  'f3110317-0000-0000-0000-000000000002',
  'f3110317-0000-0000-0000-000000000003'
);
INSERT INTO public.profiles (id, email, role, verification_status)
VALUES
  ('f3110317-0000-0000-0000-000000000001', 'signup-agent-active@local.invalid', 'agent'::public.user_role, 'verified'),
  ('f3110317-0000-0000-0000-000000000002', 'signup-agent-paused@local.invalid', 'agent'::public.user_role, 'verified'),
  ('f3110317-0000-0000-0000-000000000003', 'signup-agent-unverified@local.invalid', 'agent'::public.user_role, 'pending');

INSERT INTO public.agent_referral_links (agent_id, code, active)
VALUES
  ('f3110317-0000-0000-0000-000000000001', 'AG-F3110317', true),
  ('f3110317-0000-0000-0000-000000000002', 'AG-F3110318', false),
  ('f3110317-0000-0000-0000-000000000003', 'AG-F3110319', true);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'f3110317-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'signup-referred@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Referred User","referral_code":"ag-f3110317","role":"admin"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f3110317-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'signup-invalid-code@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Invalid Code","referral_code":"AG-AAAAAAAA"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f3110317-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'signup-paused-code@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Paused Code","referral_code":"AG-F3110318"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f3110317-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'signup-unverified-code@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Unverified Code","referral_code":"AG-F3110319"}', now(), now());

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.agent_signup_attributions
    WHERE referred_user_id = 'f3110317-0000-0000-0000-000000000004'
      AND agent_id = 'f3110317-0000-0000-0000-000000000001'
      AND referral_code = 'AG-F3110317'
  ),
  'a normalized active verified code creates one signup attribution'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.agent_signup_attributions
    WHERE referred_user_id = 'f3110317-0000-0000-0000-000000000005'
  ),
  'an invalid code creates no attribution'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.agent_signup_attributions
    WHERE referred_user_id = 'f3110317-0000-0000-0000-000000000006'
  ),
  'a paused code creates no attribution'
);
SELECT ok(
  (SELECT role = 'buyer'::public.user_role FROM public.profiles WHERE id = 'f3110317-0000-0000-0000-000000000004'),
  'signup metadata cannot assign an elevated profile role'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.agent_signup_attributions', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.agent_signup_attributions', 'SELECT'),
  'anonymous and authenticated clients cannot read attribution rows'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.agent_signup_attributions', 'INSERT')
    AND NOT has_table_privilege('authenticated', 'public.agent_signup_attributions', 'UPDATE')
    AND NOT has_table_privilege('authenticated', 'public.agent_signup_attributions', 'DELETE'),
  'authenticated clients cannot create or alter attribution rows'
);
SELECT ok(
  has_table_privilege('service_role', 'public.agent_signup_attributions', 'SELECT')
    AND NOT has_table_privilege('service_role', 'public.agent_signup_attributions', 'INSERT')
    AND NOT has_table_privilege('service_role', 'public.agent_signup_attributions', 'UPDATE')
    AND NOT has_table_privilege('service_role', 'public.agent_signup_attributions', 'DELETE'),
  'service role can read attribution but cannot mutate the ledger'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.ensure_agent_referral_link()', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.ensure_agent_referral_link()', 'EXECUTE')
    AND NOT has_function_privilege('service_role', 'public.ensure_agent_referral_link()', 'EXECUTE'),
  'only authenticated accounts can provision their own signup code'
);
SELECT throws_ok(
  $$UPDATE public.agent_signup_attributions SET referral_code = 'AG-AAAAAAAA' WHERE referred_user_id = 'f3110317-0000-0000-0000-000000000004'$$,
  'P0001',
  'Agent signup attribution is immutable.',
  'attribution updates are rejected'
);
SELECT throws_ok(
  $$DELETE FROM public.agent_signup_attributions WHERE referred_user_id = 'f3110317-0000-0000-0000-000000000004'$$,
  'P0001',
  'Agent signup attribution is immutable.',
  'attribution deletion is rejected'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.agent_signup_attributions
    WHERE referred_user_id = 'f3110317-0000-0000-0000-000000000007'
  ),
  'unverified agent codes create no attribution'
);

SELECT * FROM finish();
ROLLBACK;
