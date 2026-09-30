BEGIN;
SELECT plan(1);

-- Keep this DEV-only test independent from optional local seed data.
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  'f2400000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'duplicate-owner@local.invalid',
  '{"full_name":"Duplicate QA"}',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION pg_temp.assert_true(condition boolean, message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF condition IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'ASSERTION FAILED: %', message;
  END IF;
END;
$$;

-- The DEV migration must be applied before this read/write test is executed.
INSERT INTO public.properties (
  id, title, location, description, zone_id, operation, property_type,
  price_usd, area_m2, status, user_id
)
VALUES (
  'f2400000-0000-0000-0000-000000000001',
  'Apartamento QA duplicado', 'Playa, La Habana', 'QA only', 'qa',
  'venta', 'apartamento', 42000, 72, 'published',
  'f2400000-0000-0000-0000-000000000000'
);

INSERT INTO public.properties (
  id, title, location, description, zone_id, operation, property_type,
  price_usd, area_m2, status, user_id
)
VALUES (
  'f2400000-0000-0000-0000-000000000002',
  'Apartamento QA duplicado', 'Playa, La Habana', 'QA only 2', 'qa',
  'venta', 'apartamento', 42000, 72, 'pending_review',
  'f2400000-0000-0000-0000-000000000000'
);

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
    FROM public.property_duplicate_flags
    WHERE property_id = 'f2400000-0000-0000-0000-000000000002'
      AND duplicate_of = 'f2400000-0000-0000-0000-000000000001'
  ),
  'a matching active listing must create one private duplicate flag'
);

SELECT pg_temp.assert_true(
  (
    SELECT moderation_message = 'Posible publicación duplicada. Revisar el anuncio relacionado antes de aprobar.'
    FROM public.properties
    WHERE id = 'f2400000-0000-0000-0000-000000000002'
  ),
  'a matching listing must remain pending with a review notice'
);

UPDATE public.properties
SET status = 'published'
WHERE id = 'f2400000-0000-0000-0000-000000000002';

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 0
    FROM public.property_duplicate_flags
    WHERE property_id = 'f2400000-0000-0000-0000-000000000002'
      AND resolved_at IS NULL
  ),
  'final moderation status must resolve duplicate flag'
);

UPDATE public.properties
SET status = 'pending_review'
WHERE id = 'f2400000-0000-0000-0000-000000000002';

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
    FROM public.property_duplicate_flags
    WHERE property_id = 'f2400000-0000-0000-0000-000000000002'
      AND resolved_at IS NULL
  ),
  'returning to review must reopen duplicate flag'
);

DELETE FROM public.properties
WHERE id IN (
  'f2400000-0000-0000-0000-000000000001',
  'f2400000-0000-0000-0000-000000000002'
);

SELECT pass('property_duplicate_rules: ok');
SELECT * FROM finish();
ROLLBACK;
