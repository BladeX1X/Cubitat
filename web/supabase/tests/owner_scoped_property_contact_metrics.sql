-- Run after 20261027120000_add_owner_scoped_property_contact_metrics.sql.
-- All accounts and listings are synthetic; this test rolls back.
\set ON_ERROR_STOP on
BEGIN;
SELECT plan(8);

SELECT ok(
  has_function_privilege('authenticated', 'public.get_own_property_contact_metrics()', 'EXECUTE'),
  'authenticated clients can use the owner-scoped metrics RPC'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.get_own_property_contact_metrics()', 'EXECUTE')
    AND NOT has_function_privilege('service_role', 'public.get_own_property_contact_metrics()', 'EXECUTE'),
  'anonymous and service roles cannot use the dashboard metrics RPC'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'public.properties', 'phone_clicks_count', 'SELECT')
    AND NOT has_column_privilege('authenticated', 'public.properties', 'whatsapp_clicks_count', 'SELECT'),
  'contact counters are not directly readable through the Data API'
);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  ('00000000-0000-0000-0000-000000000000', 'f2711000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'metrics-agent-one@local.invalid', crypt('Local-only-1!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Metrics One"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f2711000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'metrics-agent-two@local.invalid', crypt('Local-only-2!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Metrics Two"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'f2711000-0000-0000-0000-000000000003',
   'authenticated', 'authenticated', 'metrics-buyer@local.invalid', crypt('Local-only-3!', gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Metrics Buyer"}', now(), now());

ALTER TABLE public.profiles DISABLE TRIGGER on_profile_role_update;
UPDATE public.profiles
SET role = CASE id
    WHEN 'f2711000-0000-0000-0000-000000000001' THEN 'agent'::public.user_role
    WHEN 'f2711000-0000-0000-0000-000000000002' THEN 'agent'::public.user_role
    ELSE 'buyer'::public.user_role END,
    verification_status = 'verified'
WHERE id IN (
  'f2711000-0000-0000-0000-000000000001',
  'f2711000-0000-0000-0000-000000000002',
  'f2711000-0000-0000-0000-000000000003'
);
ALTER TABLE public.profiles ENABLE TRIGGER on_profile_role_update;

INSERT INTO public.properties (
  id, title, location, description, zone_id, operation, property_type, area_m2,
  status, user_id, phone_clicks_count, whatsapp_clicks_count
)
VALUES
  ('f2711000-0000-0000-0000-000000000011', 'Metrics one', 'Cuba', 'Synthetic listing one',
   'cuba', 'venta', 'casa', 80, 'published', 'f2711000-0000-0000-0000-000000000001', 2, 3),
  ('f2711000-0000-0000-0000-000000000012', 'Metrics two', 'Cuba', 'Synthetic listing two',
   'cuba', 'venta', 'casa', 80, 'published', 'f2711000-0000-0000-0000-000000000002', 5, 7),
  ('f2711000-0000-0000-0000-000000000013', 'Metrics buyer', 'Cuba', 'Synthetic buyer listing',
   'cuba', 'venta', 'casa', 80, 'published', 'f2711000-0000-0000-0000-000000000003', 9, 11);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f2711000-0000-0000-0000-000000000001';
SET LOCAL request.jwt.claims = '{"sub":"f2711000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}';
SELECT is((SELECT count(*) FROM public.get_own_property_contact_metrics()), 1::bigint,
  'verified agent sees metrics only for their own listings');
SELECT is((SELECT phone_clicks_count FROM public.get_own_property_contact_metrics()), 2::bigint,
  'verified agent receives own phone metric');
SELECT is((SELECT whatsapp_clicks_count FROM public.get_own_property_contact_metrics()), 3::bigint,
  'verified agent receives own WhatsApp metric');
SELECT is((SELECT count(*) FROM public.get_own_property_contact_metrics()
  WHERE property_id = 'f2711000-0000-0000-0000-000000000012'), 0::bigint,
  'agent cannot request another owner’s metric by guessing a property id');

RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'f2711000-0000-0000-0000-000000000003';
SET LOCAL request.jwt.claims = '{"sub":"f2711000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}';
SELECT is((SELECT count(*) FROM public.get_own_property_contact_metrics()), 0::bigint,
  'verified buyer without agent role receives no private contact metrics');

SELECT * FROM finish();
ROLLBACK;
