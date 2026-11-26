-- Run after all migrations in an isolated local Supabase database.
\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(10);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'f2520000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'oauth-agent@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"OAuth Referrer"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f2520000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'oauth-ineligible-agent@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"OAuth Ineligible Referrer"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f2520000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'oauth-new-google@local.invalid', '', '{"provider":"google","providers":["google"]}', '{"full_name":"New Google Account"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f2520000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'oauth-old-google@local.invalid', '', '{"provider":"google","providers":["google"]}', '{"full_name":"Existing Google Account"}', now() - interval '1 day', now()),
  ('00000000-0000-0000-0000-000000000000', 'f2520000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', 'oauth-new-email@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"New Email Account"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f2520000-0000-0000-0000-000000000014', 'authenticated', 'authenticated', 'oauth-new-google-ineligible@local.invalid', '', '{"provider":"google","providers":["google"]}', '{"full_name":"New Google Account No Role"}', now(), now());

INSERT INTO public.agent_applications (
  id, user_id, province, education_title, cv_path, diploma_path
) VALUES
  ('f2520000-0000-0000-0000-000000000101', 'f2520000-0000-0000-0000-000000000001', 'La Habana', 'Synthetic agent profile', 'f2520000-0000-0000-0000-000000000001/f2520000-0000-0000-0000-000000000101/cv.pdf', 'f2520000-0000-0000-0000-000000000101/diploma.pdf'),
  ('f2520000-0000-0000-0000-000000000102', 'f2520000-0000-0000-0000-000000000002', 'La Habana', 'Synthetic agent profile', 'f2520000-0000-0000-0000-000000000002/f2520000-0000-0000-0000-000000000102/cv.pdf', 'f2520000-0000-0000-0000-000000000102/diploma.pdf');
INSERT INTO public.agent_province_assignments (application_id, agent_id, province)
VALUES
  ('f2520000-0000-0000-0000-000000000101', 'f2520000-0000-0000-0000-000000000001', 'La Habana'),
  ('f2520000-0000-0000-0000-000000000102', 'f2520000-0000-0000-0000-000000000002', 'La Habana');
ALTER TABLE public.profiles DISABLE TRIGGER on_profile_role_update;
UPDATE public.profiles
SET role = 'agent'::public.user_role,
    verification_status = CASE WHEN id = 'f2520000-0000-0000-0000-000000000001' THEN 'verified' ELSE 'pending' END
WHERE id IN ('f2520000-0000-0000-0000-000000000001', 'f2520000-0000-0000-0000-000000000002');
ALTER TABLE public.profiles ENABLE TRIGGER on_profile_role_update;

INSERT INTO public.agent_referral_links (agent_id, code, active)
VALUES
  ('f2520000-0000-0000-0000-000000000001', 'AG-25200001', true),
  ('f2520000-0000-0000-0000-000000000002', 'AG-25200002', false);

SELECT ok(
  has_function_privilege('authenticated', 'public.attribute_own_oauth_agent_signup(text)', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.attribute_own_oauth_agent_signup(text)', 'EXECUTE')
    AND NOT has_function_privilege('service_role', 'public.attribute_own_oauth_agent_signup(text)', 'EXECUTE'),
  'only authenticated clients can call OAuth referral attribution'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.agent_signup_attributions', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.agent_signup_attributions', 'SELECT'),
  'the attribution ledger remains private'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f2520000-0000-0000-0000-000000000011';
SET LOCAL request.jwt.claims = '{"sub":"f2520000-0000-0000-0000-000000000011","role":"authenticated","aal":"aal1"}';
SELECT is(public.attribute_own_oauth_agent_signup('ag-25200001'), true,
  'a recent Google buyer can attribute its captured valid code');
SELECT is(public.attribute_own_oauth_agent_signup('AG-25200001'), false,
  'the same account cannot create a second attribution');

RESET ROLE;
SELECT is((SELECT count(*) FROM public.agent_signup_attributions WHERE referred_user_id='f2520000-0000-0000-0000-000000000011'), 1::bigint,
  'the valid signup creates exactly one ledger row');

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f2520000-0000-0000-0000-000000000012';
SET LOCAL request.jwt.claims = '{"sub":"f2520000-0000-0000-0000-000000000012","role":"authenticated","aal":"aal1"}';
SELECT is(public.attribute_own_oauth_agent_signup('AG-25200001'), false,
  'an existing Google account cannot be attributed retroactively');

SET LOCAL request.jwt.claim.sub = 'f2520000-0000-0000-0000-000000000013';
SET LOCAL request.jwt.claims = '{"sub":"f2520000-0000-0000-0000-000000000013","role":"authenticated","aal":"aal1"}';
SELECT is(public.attribute_own_oauth_agent_signup('AG-25200001'), false,
  'email accounts cannot use the OAuth attribution RPC');

SET LOCAL request.jwt.claim.sub = 'f2520000-0000-0000-0000-000000000014';
SET LOCAL request.jwt.claims = '{"sub":"f2520000-0000-0000-0000-000000000014","role":"authenticated","aal":"aal1"}';
SELECT is(public.attribute_own_oauth_agent_signup('AG-25200002'), false,
  'a paused referral link cannot receive attribution');
RESET ROLE;
UPDATE public.agent_referral_links SET active=true WHERE code='AG-25200002';
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f2520000-0000-0000-0000-000000000014';
SET LOCAL request.jwt.claims = '{"sub":"f2520000-0000-0000-0000-000000000014","role":"authenticated","aal":"aal1"}';
SELECT is(public.attribute_own_oauth_agent_signup('AG-25200002'), false,
  'a link owned by an unverified agent cannot receive attribution');
SELECT is(public.attribute_own_oauth_agent_signup('not-a-code'), false,
  'an invalid referral code is ignored');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
