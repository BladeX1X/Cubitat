-- Run only against an isolated local Supabase scratch database.
\set ON_ERROR_STOP on
BEGIN;
\ir ../migrations/20261028193000_preserve_agent_referral_link_pause.sql
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(9);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id IN (
    'f2819300-0000-0000-0000-000000000001',
    'f2819300-0000-0000-0000-000000000002',
    'f2819300-0000-0000-0000-000000000003',
    'f2819300-0000-0000-0000-000000000004'
  )) THEN
    RAISE EXCEPTION 'Synthetic referral pause test users already exist.';
  END IF;
END;
$$;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'f2819300-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'referral-active@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Synthetic Active Agent"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f2819300-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'referral-paused@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Synthetic Paused Agent"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f2819300-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'referral-new@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Synthetic New Agent"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f2819300-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'referral-unverified@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Synthetic Unverified Agent"}', now(), now());

DELETE FROM public.profiles
WHERE id IN (
  'f2819300-0000-0000-0000-000000000001',
  'f2819300-0000-0000-0000-000000000002',
  'f2819300-0000-0000-0000-000000000003',
  'f2819300-0000-0000-0000-000000000004'
);
INSERT INTO public.profiles (id, email, role, verification_status)
VALUES
  ('f2819300-0000-0000-0000-000000000001', 'referral-active@local.invalid', 'agent'::public.user_role, 'verified'),
  ('f2819300-0000-0000-0000-000000000002', 'referral-paused@local.invalid', 'agent'::public.user_role, 'verified'),
  ('f2819300-0000-0000-0000-000000000003', 'referral-new@local.invalid', 'agent'::public.user_role, 'verified'),
  ('f2819300-0000-0000-0000-000000000004', 'referral-unverified@local.invalid', 'agent'::public.user_role, 'pending');

INSERT INTO public.agent_referral_links (agent_id, code, active)
VALUES
  ('f2819300-0000-0000-0000-000000000001', 'AG-F2819301', true),
  ('f2819300-0000-0000-0000-000000000002', 'AG-F2819302', false);

SELECT ok(NOT has_function_privilege('anon', 'public.ensure_agent_referral_link()', 'EXECUTE'), 'anon cannot execute paused provisioning RPC');
SELECT ok(NOT has_function_privilege('authenticated', 'public.ensure_agent_referral_link()', 'EXECUTE'), 'authenticated cannot execute paused provisioning RPC');
SELECT ok(NOT has_function_privilege('service_role', 'public.ensure_agent_referral_link()', 'EXECUTE'), 'service_role cannot execute paused provisioning RPC');

-- Temporarily grant only inside this rollback-only regression so it can prove
-- function semantics independently of the external API pause.
GRANT EXECUTE ON FUNCTION public.ensure_agent_referral_link() TO authenticated;

SELECT set_config('request.jwt.claims', '{"sub":"f2819300-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.ensure_agent_referral_link()$$,
  '42501',
  'Referral link is paused.',
  'paused link is rejected'
);
RESET ROLE;
SELECT is(
  (SELECT active FROM public.agent_referral_links WHERE agent_id = 'f2819300-0000-0000-0000-000000000002'),
  false,
  'paused link remains inactive after rejection'
);

SELECT set_config('request.jwt.claims', '{"sub":"f2819300-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
SET LOCAL ROLE authenticated;
SELECT is(
  public.ensure_agent_referral_link(),
  'AG-F2819301',
  'active link returns the existing code'
);
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"f2819300-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
SET LOCAL ROLE authenticated;
CREATE TEMP TABLE created_referral_code AS SELECT public.ensure_agent_referral_link() AS code;
SELECT ok((SELECT code ~ '^AG-[0-9A-F]{8}$' FROM created_referral_code), 'eligible agent receives a correctly formatted code');
SELECT is(public.ensure_agent_referral_link(), (SELECT code FROM created_referral_code), 'repeated provisioning returns the same code');
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"f2819300-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}', true);
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.ensure_agent_referral_link()$$,
  '42501',
  'Verified agent required.',
  'unverified agent remains ineligible'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
