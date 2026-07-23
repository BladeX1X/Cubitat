\set ON_ERROR_STOP on

BEGIN;

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

CREATE OR REPLACE FUNCTION pg_temp.assert_raises(statement text, expected_message text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%' || expected_message || '%' THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'ASSERTION FAILED: expected error containing "%", got "%"', expected_message, SQLERRM;
  END;

  RAISE EXCEPTION 'ASSERTION FAILED: statement succeeded; expected error containing "%"', expected_message;
END;
$$;

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'f2000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'phase2-owner@local.invalid',
    crypt('Local-only-1!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"QA Owner","role":"agent"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f2000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'phase2-other@local.invalid',
    crypt('Local-only-2!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"QA Other","role":"buyer"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f2000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'phase2-admin@local.invalid',
    crypt('Local-only-3!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"QA Admin","role":"admin"}',
    now(),
    now()
  );

-- La creacion publica siempre degrada `admin` a `buyer`. Para la fixture local,
-- simulamos la promocion administrativa fuera de banda que Supabase realiza de
-- forma controlada, sin debilitar el trigger que protege cambios de rol.
ALTER TABLE public.profiles DISABLE TRIGGER on_profile_role_update;
UPDATE public.profiles
SET role = 'admin'::public.user_role
WHERE id = 'f2000000-0000-0000-0000-000000000003';
ALTER TABLE public.profiles ENABLE TRIGGER on_profile_role_update;

UPDATE public.profiles
SET phone = '+5300000000',
    agency_name = 'Agencia QA Local',
    license_number = 'LOCAL-QA-001',
    bio = 'Perfil sintético para pruebas locales.'
WHERE id = 'f2000000-0000-0000-0000-000000000001';

INSERT INTO public.properties (
  id,
  title,
  location,
  description,
  zone_id,
  operation,
  property_type,
  price_usd,
  area_m2,
  status,
  user_id
)
VALUES (
  'f2100000-0000-0000-0000-000000000001',
  'Propiedad QA local de agente',
  'Entorno local',
  'Registro sintético que se revierte al finalizar.',
  'local-qa',
  'venta',
  'casa',
  1,
  1,
  'published',
  'f2000000-0000-0000-0000-000000000001'
);

-- Propietario AAL1: ve solo lo propio, no puede auto-verificarse y controla su carpeta.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.profiles),
  'owner must read only their profile'
);
SELECT pg_temp.assert_raises(
  $$UPDATE public.profiles SET verification_status = 'verified' WHERE id = 'f2000000-0000-0000-0000-000000000001'$$,
  'No tienes permisos para modificar la verificacion de identidad'
);

INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES (
  'kyc_documents',
  'f2000000-0000-0000-0000-000000000001/identity.webp',
  'f2000000-0000-0000-0000-000000000001',
  '{"mimetype":"image/webp","size":128}'
);

SELECT pg_temp.assert_raises(
  $$INSERT INTO storage.objects (bucket_id, name, owner, metadata) VALUES ('kyc_documents', 'f2000000-0000-0000-0000-000000000002/forbidden.webp', 'f2000000-0000-0000-0000-000000000001', '{"mimetype":"image/webp","size":128}')$$,
  'row-level security'
);

SELECT public.submit_kyc_request(
  'identity_card',
  'f2000000-0000-0000-0000-000000000001/identity.webp'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.kyc_requests WHERE status = 'pending'),
  'owner must read their pending KYC request'
);
SELECT pg_temp.assert_true(
  (SELECT verification_status = 'pending' FROM public.profiles),
  'submission must mark owner pending'
);
SELECT pg_temp.assert_true(
  (SELECT phone IS NULL AND license_number IS NULL
   FROM public.get_public_agent_profile('f2000000-0000-0000-0000-000000000001')),
  'unverified public profile must hide phone and license'
);

RESET ROLE;

-- Otro usuario AAL1: no ve KYC, documento ni perfil privado ajenos.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.profiles), 'other user sees only own profile');
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.kyc_requests), 'other user must not read owner KYC');
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM storage.objects WHERE bucket_id = 'kyc_documents'),
  'other user must not read owner document'
);
SELECT pg_temp.assert_raises(
  $$SELECT public.submit_kyc_request('identity_card', 'f2000000-0000-0000-0000-000000000001/identity.webp')$$,
  'Ruta de documento no valida'
);

RESET ROLE;

-- Administrador AAL1: el rol solo no concede moderación KYC.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.profiles), 'admin AAL1 sees only own profile');
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.kyc_requests), 'admin AAL1 must not read KYC');
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM storage.objects WHERE bucket_id = 'kyc_documents'),
  'admin AAL1 must not read KYC documents'
);
SELECT pg_temp.assert_raises(
  $$SELECT public.review_kyc_request((SELECT id FROM public.kyc_requests LIMIT 1), 'approved', NULL)$$,
  'Permiso denegado'
);

RESET ROLE;

-- Administrador AAL2: puede leer y aprobar, sin ampliar el perfil público antes de aprobar.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}',
  true
);
SET LOCAL ROLE authenticated;

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 3
    FROM public.profiles
    WHERE id IN (
      'f2000000-0000-0000-0000-000000000001',
      'f2000000-0000-0000-0000-000000000002',
      'f2000000-0000-0000-0000-000000000003'
    )
  ),
  'admin AAL2 reads all local QA profiles'
);
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.kyc_requests), 'admin AAL2 reads pending KYC');
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM storage.objects WHERE bucket_id = 'kyc_documents'),
  'admin AAL2 reads private KYC document'
);
SELECT public.review_kyc_request((SELECT id FROM public.kyc_requests), 'approved', NULL);
SELECT pg_temp.assert_true(
  (SELECT status = 'approved' FROM public.kyc_requests),
  'admin AAL2 approval must update request'
);

RESET ROLE;

-- Cola de alertas: el trigger encola, solo service_role reclama y el reclamo es atomico.
INSERT INTO public.notifications (id, user_id, title, message, event_key)
VALUES (
  'f2200000-0000-0000-0000-000000000001',
  'f2000000-0000-0000-0000-000000000001',
  'Alerta QA local',
  'Mensaje sintetico; nunca se envia fuera del entorno local.',
  'search-alert:local-qa:property:f2100000-0000-0000-0000-000000000001'
);
SELECT pg_temp.assert_true(
  (SELECT email_delivery_status = 'pending' AND email_attempts = 0
   FROM public.notifications
   WHERE id = 'f2200000-0000-0000-0000-000000000001'),
  'search alert trigger must enqueue email delivery'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_raises(
  $$SELECT public.claim_pending_alert_emails(1)$$,
  'permission denied'
);
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.claim_pending_alert_emails(1)),
  'service role must claim one pending alert'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0 FROM public.claim_pending_alert_emails(1)),
  'second overlapping claim must not duplicate processing'
);
RESET ROLE;

SELECT pg_temp.assert_true(
  (SELECT email_delivery_status = 'processing' AND email_attempts = 1
   FROM public.notifications
   WHERE id = 'f2200000-0000-0000-0000-000000000001'),
  'atomic claim must mark processing and increment attempts once'
);

-- RPC pública: después de aprobar expone solo los campos profesionales permitidos.
SELECT set_config('request.jwt.claims', '{"role":"anon","aal":"aal1"}', true);
SET LOCAL ROLE anon;

SELECT pg_temp.assert_true(
  (SELECT verification_status = 'verified'
      AND phone = '+5300000000'
      AND license_number = 'LOCAL-QA-001'
      AND active_properties_count = 1
   FROM public.get_public_agent_profile('f2000000-0000-0000-0000-000000000001')),
  'public agent RPC must return approved professional profile and aggregate'
);
SELECT pg_temp.assert_raises(
  $$SELECT * FROM public.profiles$$,
  'permission denied'
);

RESET ROLE;

ROLLBACK;

SELECT 'phase2_local_security: ok' AS result;
