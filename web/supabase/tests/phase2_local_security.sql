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
SELECT pg_temp.assert_raises(
  $$UPDATE public.profiles SET role = 'agent' WHERE id = 'f2000000-0000-0000-0000-000000000001'$$,
  'Debes completar y aprobar la verificacion de identidad'
);

INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES
  (
    'kyc_documents',
    'f2000000-0000-0000-0000-000000000001/document-identity.webp',
    'f2000000-0000-0000-0000-000000000001',
    '{"mimetype":"image/webp","size":128}'
  ),
  (
    'kyc_documents',
    'f2000000-0000-0000-0000-000000000001/selfie-identity.webp',
    'f2000000-0000-0000-0000-000000000001',
    '{"mimetype":"image/webp","size":128}'
  );

SELECT pg_temp.assert_raises(
  $$INSERT INTO storage.objects (bucket_id, name, owner, metadata) VALUES ('kyc_documents', 'f2000000-0000-0000-0000-000000000002/forbidden.webp', 'f2000000-0000-0000-0000-000000000001', '{"mimetype":"image/webp","size":128}')$$,
  'row-level security'
);

SELECT public.submit_kyc_request(
  'identity_card',
  'f2000000-0000-0000-0000-000000000001/document-identity.webp',
  'f2000000-0000-0000-0000-000000000001/selfie-identity.webp'
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
  (SELECT count(*) = 0
   FROM public.get_public_agent_profile('f2000000-0000-0000-0000-000000000001')),
  'unverified advertiser must not be exposed as a public agent'
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
  $$SELECT public.submit_kyc_request('identity_card', 'f2000000-0000-0000-0000-000000000001/document-identity.webp', 'f2000000-0000-0000-0000-000000000001/selfie-identity.webp')$$,
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
SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
    FROM public.kyc_requests
    WHERE user_id = 'f2000000-0000-0000-0000-000000000001'
  ),
  'admin AAL2 reads the pending QA KYC'
);
SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 2
    FROM storage.objects
    WHERE bucket_id = 'kyc_documents'
      AND name LIKE 'f2000000-0000-0000-0000-000000000001/%'
  ),
  'admin AAL2 reads both private KYC evidences'
);
SELECT public.review_kyc_request(
  (
    SELECT id
    FROM public.kyc_requests
    WHERE user_id = 'f2000000-0000-0000-0000-000000000001'
  ),
  'approved',
  NULL
);
SELECT pg_temp.assert_true(
  (
    SELECT status = 'approved'
    FROM public.kyc_requests
    WHERE user_id = 'f2000000-0000-0000-0000-000000000001'
  ),
  'admin AAL2 approval must update request'
);
SELECT pg_temp.assert_true(
  (
    SELECT evidence_purge_after >= updated_at + interval '23 hours 59 minutes'
    FROM public.kyc_requests
    WHERE user_id = 'f2000000-0000-0000-0000-000000000001'
  ),
  'approved KYC must schedule evidence purge after 24 hours'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 0
   FROM public.get_public_agent_profile('f2000000-0000-0000-0000-000000000001')),
  'verified buyer must not be exposed as a public agent'
);

RESET ROLE;

CREATE TEMP TABLE fresh_claimed_kyc_evidence (
  id uuid,
  document_path text,
  selfie_path text
) ON COMMIT DROP;
GRANT SELECT, INSERT ON fresh_claimed_kyc_evidence TO service_role;

SET LOCAL ROLE service_role;
INSERT INTO fresh_claimed_kyc_evidence
SELECT * FROM public.claim_kyc_evidence_for_purge(25);
RESET ROLE;
SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 0
    FROM fresh_claimed_kyc_evidence c
    JOIN public.kyc_requests r ON r.id = c.id
    WHERE r.user_id = 'f2000000-0000-0000-0000-000000000001'
  ),
  'freshly approved KYC must not be claimed before 24 hours'
);

UPDATE public.kyc_requests
SET evidence_purge_after = now() - interval '1 minute'
WHERE user_id = 'f2000000-0000-0000-0000-000000000001';

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}',
  true
);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_raises(
  $$SELECT * FROM public.claim_kyc_evidence_for_purge(25)$$,
  'permission denied'
);
RESET ROLE;

CREATE TEMP TABLE claimed_kyc_evidence (
  id uuid,
  document_path text,
  selfie_path text
) ON COMMIT DROP;
GRANT SELECT, INSERT ON claimed_kyc_evidence TO service_role;

SET LOCAL ROLE service_role;
INSERT INTO claimed_kyc_evidence
SELECT * FROM public.claim_kyc_evidence_for_purge(25);
RESET ROLE;
SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
    FROM claimed_kyc_evidence c
    JOIN public.kyc_requests r ON r.id = c.id
    WHERE r.user_id = 'f2000000-0000-0000-0000-000000000001'
  ),
  'service role must claim one due approved KYC request'
);

SET LOCAL ROLE service_role;
SELECT pg_temp.assert_raises(
  format(
    'SELECT public.complete_kyc_evidence_purge(%L)',
    (SELECT id FROM claimed_kyc_evidence)
  ),
  'siguen presentes en Storage'
);
SELECT public.release_kyc_evidence_purge((SELECT id FROM claimed_kyc_evidence));
RESET ROLE;

SELECT pg_temp.assert_true(
  (
    SELECT document_path IS NOT NULL
      AND selfie_path IS NOT NULL
      AND evidence_purged_at IS NULL
      AND evidence_purge_claimed_at IS NULL
      AND status = 'approved'
    FROM public.kyc_requests
    WHERE user_id = 'f2000000-0000-0000-0000-000000000001'
  ),
  'database paths must remain when Storage has not confirmed deletion'
);
SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 2
    FROM storage.objects
    WHERE bucket_id = 'kyc_documents'
      AND name LIKE 'f2000000-0000-0000-0000-000000000001/%'
  ),
  'failed completion must preserve both private evidence objects'
);

UPDATE public.kyc_requests
SET status = 'rejected',
    rejection_reason = 'Rechazo QA para validar retencion de una hora.',
    updated_at = now()
WHERE user_id = 'f2000000-0000-0000-0000-000000000001';

SELECT pg_temp.assert_true(
  (
    SELECT evidence_purge_after >= updated_at + interval '59 minutes'
      AND evidence_purge_after <= updated_at + interval '61 minutes'
    FROM public.kyc_requests
    WHERE user_id = 'f2000000-0000-0000-0000-000000000001'
  ),
  'rejected KYC must schedule evidence purge after one hour'
);

CREATE TEMP TABLE fresh_rejected_claim (
  id uuid,
  document_path text,
  selfie_path text
) ON COMMIT DROP;
GRANT SELECT, INSERT ON fresh_rejected_claim TO service_role;

SET LOCAL ROLE service_role;
INSERT INTO fresh_rejected_claim
SELECT * FROM public.claim_kyc_evidence_for_purge(25);
RESET ROLE;

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 0
    FROM fresh_rejected_claim c
    JOIN public.kyc_requests r ON r.id = c.id
    WHERE r.user_id = 'f2000000-0000-0000-0000-000000000001'
  ),
  'freshly rejected KYC must not be claimed before one hour'
);

UPDATE public.kyc_requests
SET evidence_purge_after = now() - interval '1 minute'
WHERE user_id = 'f2000000-0000-0000-0000-000000000001';

CREATE TEMP TABLE due_rejected_claim (
  id uuid,
  document_path text,
  selfie_path text
) ON COMMIT DROP;
GRANT SELECT, INSERT ON due_rejected_claim TO service_role;

SET LOCAL ROLE service_role;
INSERT INTO due_rejected_claim
SELECT * FROM public.claim_kyc_evidence_for_purge(25);
RESET ROLE;

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
    FROM due_rejected_claim c
    JOIN public.kyc_requests r ON r.id = c.id
    WHERE r.user_id = 'f2000000-0000-0000-0000-000000000001'
  ),
  'service role must claim rejected KYC after one hour'
);

SET LOCAL ROLE service_role;
SELECT public.release_kyc_evidence_purge((SELECT id FROM due_rejected_claim));
RESET ROLE;

-- Tras la aprobacion, el propietario ya puede activar el rol de agente.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
SET LOCAL ROLE authenticated;
UPDATE public.profiles
SET role = 'agent'
WHERE id = 'f2000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_true(
  (SELECT role = 'agent' FROM public.profiles),
  'verified owner must be able to activate the agent role'
);
RESET ROLE;

-- El navegador no puede invocar la mutacion; solo service_role registra el
-- identificador seudonimo derivado por el Worker. La tabla sigue privada.
SELECT set_config('request.jwt.claims', '{"role":"anon","aal":"aal1"}', true);
SET LOCAL ROLE anon;
SELECT pg_temp.assert_raises(
  $$SELECT * FROM public.increment_contact_clicks(
    'f2100000-0000-0000-0000-000000000001',
    'phone',
    'f2300000-0000-0000-0000-000000000001'
  )$$,
  'permission denied'
);
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT pg_temp.assert_true(
  (SELECT phone_clicks_count = 1 AND whatsapp_clicks_count = 0
   FROM public.increment_contact_clicks(
     'f2100000-0000-0000-0000-000000000001',
     'phone',
     'f2300000-0000-0000-0000-000000000001'
   )),
  'first phone click must increment the aggregate'
);
SELECT pg_temp.assert_true(
  (SELECT phone_clicks_count = 1 AND whatsapp_clicks_count = 0
   FROM public.increment_contact_clicks(
     'f2100000-0000-0000-0000-000000000001',
     'phone',
     'f2300000-0000-0000-0000-000000000001'
   )),
  'same visitor and channel must be deduplicated for the day'
);
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.assert_raises(
  $$SELECT * FROM public.property_contact_clicks$$,
  'permission denied'
);
SELECT pg_temp.assert_true(
  (SELECT EXISTS (
    SELECT 1
    FROM public.get_verified_agent_ids()
    WHERE id = 'f2000000-0000-0000-0000-000000000001'
  )),
  'public projection must include the verified agent'
);
RESET ROLE;

-- Cola de alertas: el trigger encola, solo service_role reclama y el reclamo es atomico.
INSERT INTO public.notifications (id, user_id, title, message, event_key, created_at)
VALUES (
  'f2200000-0000-0000-0000-000000000001',
  'f2000000-0000-0000-0000-000000000001',
  'Alerta QA local',
  'Mensaje sintetico; nunca se envia fuera del entorno local.',
  'search-alert:local-qa:property:f2100000-0000-0000-0000-000000000001',
  '2000-01-01 00:00:00+00'
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

CREATE TEMP TABLE first_alert_claim (
  id uuid,
  user_id uuid,
  title text,
  message text,
  email_attempts integer
) ON COMMIT DROP;
CREATE TEMP TABLE second_alert_claim (
  id uuid,
  user_id uuid,
  title text,
  message text,
  email_attempts integer
) ON COMMIT DROP;
GRANT SELECT, INSERT ON first_alert_claim, second_alert_claim TO service_role;

SET LOCAL ROLE service_role;
INSERT INTO first_alert_claim
SELECT * FROM public.claim_pending_alert_emails(1);
INSERT INTO second_alert_claim
SELECT * FROM public.claim_pending_alert_emails(1);
RESET ROLE;

SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 1
    FROM first_alert_claim
    WHERE id = 'f2200000-0000-0000-0000-000000000001'
  ),
  'service role must claim the QA pending alert'
);
SELECT pg_temp.assert_true(
  (
    SELECT count(*) = 0
    FROM second_alert_claim
    WHERE id = 'f2200000-0000-0000-0000-000000000001'
  ),
  'second overlapping claim must not duplicate the QA alert'
);

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

-- Si una revision interna retira el KYC, el trigger degrada al agente a buyer.
SELECT set_config('app.kyc_internal', 'true', true);
UPDATE public.profiles
SET verification_status = 'rejected',
    verification_reason = 'QA: revocacion sintetica'
WHERE id = 'f2000000-0000-0000-0000-000000000001';
SELECT pg_temp.assert_true(
  (
    SELECT role = 'buyer' AND verification_status = 'rejected'
    FROM public.profiles
    WHERE id = 'f2000000-0000-0000-0000-000000000001'
  ),
  'losing verified KYC must demote the agent to buyer'
);

ROLLBACK;

SELECT 'phase2_local_security: ok' AS result;
