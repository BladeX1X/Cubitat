-- Isolated local database only. Leaves no test records.
\set ON_ERROR_STOP on
BEGIN;
SELECT plan(1);
CREATE FUNCTION pg_temp.assert_true(ok boolean, message text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '%', message; END IF;
END; $$;

INSERT INTO auth.users(id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES ('f1091200-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
  'coordinate-owner@local.invalid', '{"full_name":"Coordinate QA"}', now(), now());
INSERT INTO public.properties(id, user_id, title, location, description, zone_id,
  operation, property_type, bedrooms, bathrooms, parking, area_m2, coordinates, status)
VALUES ('f1091200-0000-0000-0000-000000000099', 'f1091200-0000-0000-0000-000000000001',
  'Coordinate QA', 'Playa, La Habana', 'QA', 'all', 'venta', 'casa', 1, 1, 0, 20,
  '{"latitude":23.1136,"longitude":-82.3666}', 'published');
SET CONSTRAINTS ALL IMMEDIATE;

SELECT pg_temp.assert_true((SELECT coordinates = '{"latitude":23.12,"longitude":-82.36}'::jsonb
  FROM public.properties WHERE id = 'f1091200-0000-0000-0000-000000000099'),
  'Public coordinates were not approximated');
SELECT pg_temp.assert_true((SELECT coordinates = '{"latitude":23.1136,"longitude":-82.3666}'::jsonb
  FROM public.property_private_coordinates
  WHERE property_id = 'f1091200-0000-0000-0000-000000000099'),
  'Exact coordinates were not preserved privately');

SET LOCAL ROLE anon;
DO $$ BEGIN
  PERFORM 1 FROM public.property_private_coordinates;
  RAISE EXCEPTION 'Anonymous private coordinate access allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL; END; $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"f1091200-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT pg_temp.assert_true((SELECT coordinates = '{"latitude":23.1136,"longitude":-82.3666}'::jsonb
  FROM public.property_private_coordinates
  WHERE property_id = 'f1091200-0000-0000-0000-000000000099'),
  'Owner cannot recover exact coordinates');
UPDATE public.properties SET coordinates = '{"latitude":23.12,"longitude":-82.36}'::jsonb,
  status = 'pending_review'
WHERE id = 'f1091200-0000-0000-0000-000000000099';
SELECT pg_temp.assert_true((SELECT coordinates = '{"latitude":23.1136,"longitude":-82.3666}'::jsonb
  FROM public.property_private_coordinates
  WHERE property_id = 'f1091200-0000-0000-0000-000000000099'),
  'Public echo erased private coordinates');
RESET ROLE;

SELECT pass('private_property_coordinates: ok');
SELECT * FROM finish();
ROLLBACK;
