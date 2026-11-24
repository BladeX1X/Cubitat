-- Isolated local database only. Leaves no test records.
\set ON_ERROR_STOP on
BEGIN;
CREATE FUNCTION pg_temp.assert_true(ok boolean, message text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION '%', message; END IF;
END; $$;
GRANT EXECUTE ON FUNCTION pg_temp.assert_true(boolean, text) TO anon, authenticated;

INSERT INTO auth.users(id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES ('f1091200-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
  'marketplace-coordinate-owner@local.invalid', '{}', now(), now());

INSERT INTO public.home_service_providers(id, owner_id, slug, display_name, category,
  description, province, coordinates)
VALUES ('f1091200-0000-0000-0000-000000000102', 'f1091200-0000-0000-0000-000000000002',
  'coordinate-service-local', 'Coordinate Service', 'plomeria',
  'Local QA service profile with a sufficiently long description.', 'La Habana',
  '{"latitude":23.1136,"longitude":-82.3666}');
INSERT INTO public.material_listings(id, owner_id, slug, title, category, description,
  province, coordinates)
VALUES ('f1091200-0000-0000-0000-000000000103', 'f1091200-0000-0000-0000-000000000002',
  'coordinate-material-local', 'Coordinate material', 'cemento',
  'Local QA material listing with a sufficiently long description.', 'Santiago de Cuba',
  '{"latitude":20.01234,"longitude":-75.81234}');

SELECT pg_temp.assert_true((SELECT coordinates = '{"latitude":23.115,"longitude":-82.365}'::jsonb
  FROM public.home_service_providers WHERE id = 'f1091200-0000-0000-0000-000000000102'),
  'Service public coordinate was not rounded');
SELECT pg_temp.assert_true((SELECT coordinates = '{"latitude":20.01,"longitude":-75.81}'::jsonb
  FROM public.material_listings WHERE id = 'f1091200-0000-0000-0000-000000000103'),
  'Material public coordinate was not rounded');
SELECT pg_temp.assert_true((SELECT coordinates = '{"latitude":23.1136,"longitude":-82.3666}'::jsonb
  FROM public.home_service_private_coordinates WHERE provider_id = 'f1091200-0000-0000-0000-000000000102'),
  'Service exact coordinate was not stored privately');
SELECT pg_temp.assert_true((SELECT coordinates = '{"latitude":20.01234,"longitude":-75.81234}'::jsonb
  FROM public.material_private_coordinates WHERE listing_id = 'f1091200-0000-0000-0000-000000000103'),
  'Material exact coordinate was not stored privately');

SET LOCAL ROLE anon;
DO $$ BEGIN
  PERFORM 1 FROM public.home_service_private_coordinates;
  PERFORM 1 FROM public.material_private_coordinates;
  RAISE EXCEPTION 'Anonymous private-coordinate access allowed';
EXCEPTION WHEN insufficient_privilege THEN NULL; END; $$;
RESET ROLE;
SELECT pg_temp.assert_true(true, 'Anonymous users cannot read exact marketplace coordinates');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"f1091200-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT pg_temp.assert_true(
  (SELECT coordinates = '{"latitude":23.1136,"longitude":-82.3666}'::jsonb
    FROM public.get_my_home_service_providers()
    WHERE id = 'f1091200-0000-0000-0000-000000000102')
  AND (SELECT coordinates = '{"latitude":20.01234,"longitude":-75.81234}'::jsonb
    FROM public.get_my_material_listings()
    WHERE id = 'f1091200-0000-0000-0000-000000000103'),
  'Owner RPCs did not return exact coordinates');
RESET ROLE;

ROLLBACK;
