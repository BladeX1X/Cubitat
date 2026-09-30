-- Isolated local database only. Leaves no test records.
\set ON_ERROR_STOP on
BEGIN;
SELECT plan(1);

CREATE FUNCTION pg_temp.assert_true(ok boolean, message text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN
    RAISE EXCEPTION '%', message;
  END IF;
END;
$$;

CREATE FUNCTION pg_temp.assert_raises(statement text, expected_message text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%' || expected_message || '%' THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'Expected "%", got "%"', expected_message, SQLERRM;
  END;
  RAISE EXCEPTION 'Statement succeeded; expected "%"', expected_message;
END;
$$;

INSERT INTO auth.users (
  id, aud, role, email, raw_user_meta_data, created_at, updated_at
)
VALUES
  (
    'f2500000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
    'property-verification-owner@local.invalid', '{"full_name":"Verification QA"}', now(), now()
  ),
  (
    'f2500000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
    'property-verification-admin@local.invalid', '{"full_name":"Verification Admin QA"}', now(), now()
  ),
  (
    'f2500000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
    'property-verification-other@local.invalid', '{"full_name":"Verification Other QA"}', now(), now()
  );

ALTER TABLE public.profiles DISABLE TRIGGER on_profile_role_update;
UPDATE public.profiles
SET role = 'admin'::public.user_role
WHERE id = 'f2500000-0000-0000-0000-000000000002';
UPDATE public.profiles
SET verification_status = 'verified'
WHERE id = 'f2500000-0000-0000-0000-000000000001';
ALTER TABLE public.profiles ENABLE TRIGGER on_profile_role_update;

INSERT INTO public.properties (
  id, title, location, description, zone_id, operation, property_type,
  price_usd, area_m2, status, user_id, contact_info
)
VALUES (
  'f2500000-0000-0000-0000-000000000099',
  'Propiedad QA verificacion documental', 'Playa, La Habana', 'QA only', 'qa',
  'venta', 'apartamento', 42000, 72, 'published',
  'f2500000-0000-0000-0000-000000000001',
  '{"phone":"+5300000000"}'::jsonb
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2500000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
SET LOCAL ROLE authenticated;

INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
  'property_documents',
  'f2500000-0000-0000-0000-000000000001/property-f2500000-0000-0000-0000-000000000099/title.pdf',
  'f2500000-0000-0000-0000-000000000001',
  '{"mimetype":"application/pdf","size":128}'
);

SELECT public.submit_property_verification(
  'f2500000-0000-0000-0000-000000000099',
  'ownership_title',
  'f2500000-0000-0000-0000-000000000001/property-f2500000-0000-0000-0000-000000000099/title.pdf',
  'Fixture sintética para prueba local.'
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1
   FROM public.property_verification_requests
   WHERE property_id = 'f2500000-0000-0000-0000-000000000099')
  AND (SELECT status = 'pending'
       FROM public.property_verification_requests
       WHERE property_id = 'f2500000-0000-0000-0000-000000000099'),
  'owner must create one pending verification request'
);

SELECT pg_temp.assert_raises(
  $$SELECT public.submit_property_verification(
    'f2500000-0000-0000-0000-000000000099',
    'ownership_title',
    'f2500000-0000-0000-0000-000000000001/property-f2500000-0000-0000-0000-000000000099/title.pdf',
    NULL
  )$$,
  'Ya existe una solicitud pendiente'
);

SELECT pg_temp.assert_true(
  (SELECT score = 60 AND identity_verified AND NOT document_verified
          AND published AND contact_present
   FROM public.get_property_trust_score('f2500000-0000-0000-0000-000000000099')),
  'owner trust score must expose the expected factors'
);

RESET ROLE;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2500000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',
  true
);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_raises(
  $$SELECT public.review_property_verification(
    (SELECT id FROM public.property_verification_requests
     WHERE property_id = 'f2500000-0000-0000-0000-000000000099'),
    'approved', NULL
  )$$,
  'Permiso denegado: se requiere administrador AAL2'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2500000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
SELECT public.review_property_verification(
  (SELECT id FROM public.property_verification_requests
   WHERE property_id = 'f2500000-0000-0000-0000-000000000099'),
  'approved', NULL
);
SELECT pg_temp.assert_true(
  (SELECT status = 'approved' AND reviewed_by = 'f2500000-0000-0000-0000-000000000002'
   FROM public.property_verification_requests
   WHERE property_id = 'f2500000-0000-0000-0000-000000000099'),
  'AAL2 admin must approve and record the reviewer'
);

RESET ROLE;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2500000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}',
  true
);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_raises(
  $$SELECT * FROM public.get_property_trust_score('f2500000-0000-0000-0000-000000000099')$$,
  'Permiso denegado'
);

SELECT pass('property_verification_local: ok');
SELECT * FROM finish();
ROLLBACK;
