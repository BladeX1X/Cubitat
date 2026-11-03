-- Run only against an isolated local Supabase scratch database.
\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(4);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id IN (
    'f2710000-0000-0000-0000-000000000001',
    'f2710000-0000-0000-0000-000000000002'
  )) THEN
    RAISE EXCEPTION 'Synthetic lead status test users already exist.';
  END IF;
END;
$$;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'f2710000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'lost-lead-agent@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Synthetic Agent"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f2710000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'lost-lead-admin@local.invalid', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Synthetic Admin"}', now(), now());

DELETE FROM public.profiles
WHERE id IN ('f2710000-0000-0000-0000-000000000001', 'f2710000-0000-0000-0000-000000000002');
INSERT INTO public.profiles (id, email, role, verification_status)
VALUES
  ('f2710000-0000-0000-0000-000000000001', 'lost-lead-agent@local.invalid', 'agent'::public.user_role, 'verified'),
  ('f2710000-0000-0000-0000-000000000002', 'lost-lead-admin@local.invalid', 'admin'::public.user_role, 'verified');

INSERT INTO public.agent_leads (
  id, agent_id, lead_type, contact_name, contact_phone, client_interest,
  consent_confirmed, status
) VALUES (
  'f2710000-0000-0000-0000-000000000011',
  'f2710000-0000-0000-0000-000000000001',
  'client', 'Synthetic Contact', '123456789', 'Synthetic interest', true, 'lost'
);
INSERT INTO public.agent_lead_events (lead_id, agent_id, actor_id, to_status, note)
VALUES (
  'f2710000-0000-0000-0000-000000000011',
  'f2710000-0000-0000-0000-000000000001',
  'f2710000-0000-0000-0000-000000000002',
  'lost', 'Synthetic administrative closure'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2710000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.update_agent_lead_status(
    'f2710000-0000-0000-0000-000000000011', 'contacted', 'Synthetic unauthorized reopen'
  )$$,
  '22023',
  'Lead status transition not allowed.',
  'verified agent cannot reopen an administratively closed lead'
);
RESET ROLE;
SELECT is(
  (SELECT status FROM public.agent_leads WHERE id = 'f2710000-0000-0000-0000-000000000011'),
  'lost',
  'rejected reopen leaves lead closed'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2710000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$SELECT public.update_agent_lead_status(
    'f2710000-0000-0000-0000-000000000011', 'contacted', 'Synthetic admin reopened after review'
  )$$,
  'AAL2 administrator can reopen with a review reason'
);
RESET ROLE;
SELECT is(
  (SELECT count(*)::integer FROM public.agent_lead_events
   WHERE lead_id = 'f2710000-0000-0000-0000-000000000011'
     AND from_status = 'lost' AND to_status = 'contacted'
     AND actor_id = 'f2710000-0000-0000-0000-000000000002'),
  1,
  'administrative reopen is recorded as an immutable transition event'
);

SELECT * FROM finish();
ROLLBACK;
