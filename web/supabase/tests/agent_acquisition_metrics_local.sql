-- Run after all migrations in an isolated local Supabase database.
\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(7);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'f2510000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'acq-agent-one@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Acquisition Agent One"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f2510000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'acq-agent-two@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Acquisition Agent Two"}', now(), now());

INSERT INTO public.agent_applications (
  id, user_id, province, education_title, cv_path, diploma_path
) VALUES
  ('f2510000-0000-0000-0000-000000000101', 'f2510000-0000-0000-0000-000000000001', 'La Habana', 'Synthetic agent profile', 'f2510000-0000-0000-0000-000000000001/f2510000-0000-0000-0000-000000000101/cv.pdf', 'f2510000-0000-0000-0000-000000000001/f2510000-0000-0000-0000-000000000101/diploma.pdf'),
  ('f2510000-0000-0000-0000-000000000102', 'f2510000-0000-0000-0000-000000000002', 'La Habana', 'Synthetic agent profile', 'f2510000-0000-0000-0000-000000000002/f2510000-0000-0000-0000-000000000102/cv.pdf', 'f2510000-0000-0000-0000-000000000002/f2510000-0000-0000-0000-000000000102/diploma.pdf');
INSERT INTO public.agent_province_assignments (application_id, agent_id, province)
VALUES
  ('f2510000-0000-0000-0000-000000000101', 'f2510000-0000-0000-0000-000000000001', 'La Habana'),
  ('f2510000-0000-0000-0000-000000000102', 'f2510000-0000-0000-0000-000000000002', 'La Habana');
ALTER TABLE public.profiles DISABLE TRIGGER on_profile_role_update;
UPDATE public.profiles
SET role = 'agent'::public.user_role, verification_status = 'verified'
WHERE id IN ('f2510000-0000-0000-0000-000000000001', 'f2510000-0000-0000-0000-000000000002');
ALTER TABLE public.profiles ENABLE TRIGGER on_profile_role_update;

INSERT INTO public.agent_referral_links (agent_id, code, active)
VALUES
  ('f2510000-0000-0000-0000-000000000001', 'AG-25100001', true),
  ('f2510000-0000-0000-0000-000000000002', 'AG-25100002', true);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'f2510000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'acq-referred-one@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Referred One","referral_code":"AG-25100001"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f2510000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'acq-referred-two@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Referred Two","referral_code":"AG-25100001"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f2510000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', 'acq-referred-other@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Referred Other","referral_code":"AG-25100002"}', now(), now());

SELECT ok(
  has_function_privilege('authenticated', 'public.get_own_agent_acquisition_metrics()', 'EXECUTE')
    AND NOT has_function_privilege('anon', 'public.get_own_agent_acquisition_metrics()', 'EXECUTE')
    AND NOT has_function_privilege('service_role', 'public.get_own_agent_acquisition_metrics()', 'EXECUTE'),
  'only authenticated clients can call the aggregate metrics function'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.agent_signup_attributions', 'SELECT')
    AND NOT has_table_privilege('authenticated', 'public.agent_signup_attributions', 'SELECT'),
  'the attribution ledger stays private to clients'
);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f2510000-0000-0000-0000-000000000001';
SET LOCAL request.jwt.claims = '{"sub":"f2510000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}';
SELECT is((SELECT registered_users FROM public.get_own_agent_acquisition_metrics()), 2::bigint,
  'agent sees only their attributed signup total');
SELECT ok(
  (SELECT paid_users IS NULL AND NOT payment_tracking_available FROM public.get_own_agent_acquisition_metrics()),
  'the function does not fabricate paid-user metrics before billing exists'
);
SELECT throws_ok(
  $$INSERT INTO public.agent_signup_attributions (referred_user_id, agent_id, referral_code)
    VALUES ('f2510000-0000-0000-0000-000000000014', 'f2510000-0000-0000-0000-000000000001', 'AG-25100001')$$,
  '42501',
  'authenticated agents cannot read or insert attribution ledger rows directly'
);

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f2510000-0000-0000-0000-000000000002';
SET LOCAL request.jwt.claims = '{"sub":"f2510000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}';
SELECT is((SELECT registered_users FROM public.get_own_agent_acquisition_metrics()), 1::bigint,
  'a second agent cannot see another agent’s referral total');

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f2510000-0000-0000-0000-000000000011';
SET LOCAL request.jwt.claims = '{"sub":"f2510000-0000-0000-0000-000000000011","role":"authenticated","aal":"aal1"}';
SELECT throws_ok(
  $$SELECT * FROM public.get_own_agent_acquisition_metrics()$$,
  '42501', 'Verified agent required.',
  'non-agents cannot read acquisition metrics'
);

SELECT * FROM finish();
ROLLBACK;
