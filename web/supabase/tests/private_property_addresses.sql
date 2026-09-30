-- Isolated local database only. Leaves no test records.
\set ON_ERROR_STOP on
BEGIN;
SELECT plan(1);
CREATE FUNCTION pg_temp.assert_true(ok boolean, message text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '%', message; END IF;
END; $$;

INSERT INTO auth.users(id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES ('f1091100-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
  'privacy-owner@local.invalid', '{"full_name":"Privacy QA"}', now(), now());
INSERT INTO public.properties(id, user_id, title, location, description, zone_id,
  operation, property_type, bedrooms, bathrooms, parking, area_m2, status)
VALUES ('f1091100-0000-0000-0000-000000000099', 'f1091100-0000-0000-0000-000000000001',
  'Privacy QA', 'Calle Sintética 999, apartamento 42, Playa, La Habana', 'QA', 'all',
  'venta', 'casa', 1, 1, 0, 20, 'published');
SET CONSTRAINTS ALL IMMEDIATE;
SELECT pg_temp.assert_true((SELECT location = 'Playa, La Habana' FROM public.properties
  WHERE id = 'f1091100-0000-0000-0000-000000000099'), 'Public address was not redacted');
SELECT pg_temp.assert_true(public.public_property_location('Calle 42, Plaza de la Revolucion, La Habana')
  = 'Plaza de la Revolución, La Habana', 'Accent normalization failed');
SELECT pg_temp.assert_true(public.public_property_location('Calle 42, Playa, Matanzas')
  = 'Matanzas', 'Unverified municipality exposed');
SELECT pg_temp.assert_true(public.public_property_location('Calle 42 sin zona')
  = 'Cuba', 'Unknown private text exposed');

SET LOCAL ROLE anon;
SELECT pg_temp.assert_true((SELECT to_jsonb(p)::text NOT LIKE '%Sintética%' FROM public.properties p
  WHERE id = 'f1091100-0000-0000-0000-000000000099'), 'Anonymous response contains address');
DO $$ BEGIN
  PERFORM 1 FROM public.property_private_addresses;
  RAISE EXCEPTION 'Anonymous private address access allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL; END; $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"f1091100-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.property_private_addresses
  WHERE property_id = 'f1091100-0000-0000-0000-000000000099'), 'Other account reads address');
SELECT set_config('request.jwt.claims', '{"sub":"f1091100-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT pg_temp.assert_true((SELECT location = 'Calle Sintética 999, apartamento 42, Playa, La Habana'
  FROM public.property_private_addresses WHERE property_id = 'f1091100-0000-0000-0000-000000000099'), 'Owner cannot recover full original');
UPDATE public.properties SET location = 'Playa, La Habana', status = 'pending_review'
WHERE id = 'f1091100-0000-0000-0000-000000000099';
SELECT pg_temp.assert_true((SELECT location LIKE 'Calle Sintética 999%' FROM public.property_private_addresses
  WHERE property_id = 'f1091100-0000-0000-0000-000000000099'), 'Public echo erased private address');
UPDATE public.properties SET location = 'Calle Nueva 55, Playa, La Habana'
WHERE id = 'f1091100-0000-0000-0000-000000000099';
SELECT pg_temp.assert_true((SELECT location = 'Calle Nueva 55, Playa, La Habana' FROM public.property_private_addresses
  WHERE property_id = 'f1091100-0000-0000-0000-000000000099'), 'Owner address update lost');
SELECT pg_temp.assert_true((SELECT location = 'Playa, La Habana' FROM public.properties
  WHERE id = 'f1091100-0000-0000-0000-000000000099'), 'Owner update exposed address');
RESET ROLE;
SELECT pass('private_property_addresses: ok');
SELECT * FROM finish();
ROLLBACK;
