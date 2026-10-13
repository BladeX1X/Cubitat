\set ON_ERROR_STOP on

BEGIN;

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
    'f2a00000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'temporary-mfa-admin@local.invalid',
    crypt('Local-only-admin-1!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Temporary MFA Admin QA","role":"buyer"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f2a00000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'temporary-mfa-buyer@local.invalid',
    crypt('Local-only-buyer-1!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Temporary MFA Buyer QA","role":"buyer"}',
    now(),
    now()
  );

ALTER TABLE public.profiles DISABLE TRIGGER on_profile_role_update;
UPDATE public.profiles
SET role = 'admin'::public.user_role
WHERE id = 'f2a00000-0000-0000-0000-000000000001';
ALTER TABLE public.profiles ENABLE TRIGGER on_profile_role_update;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2a00000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  override_expiry timestamptz;
BEGIN
  SELECT public.get_admin_mfa_bypass_until() INTO override_expiry;
  IF override_expiry IS NULL
    OR override_expiry <= statement_timestamp()
    OR override_expiry > statement_timestamp() + interval '7 days'
  THEN
    RAISE EXCEPTION 'admin must receive a future deadline within the seven-day window';
  END IF;
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'admin AAL1 session must pass the temporary MFA override';
  END IF;
  BEGIN
    PERFORM 1 FROM public.admin_mfa_temporary_overrides;
    RAISE EXCEPTION 'authenticated must not read the private override table';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$$;

RESET ROLE;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2a00000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}',
  true
);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF public.get_admin_mfa_bypass_until() IS NOT NULL THEN
    RAISE EXCEPTION 'non-admin must not receive the override deadline';
  END IF;
  IF public.is_admin_aal2() THEN
    RAISE EXCEPTION 'non-admin AAL1 session must remain outside the override';
  END IF;
END;
$$;

RESET ROLE;
UPDATE public.admin_mfa_temporary_overrides
SET expires_at = statement_timestamp() - interval '1 second'
WHERE override_key = 'global';
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2a00000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF public.is_admin_aal2() THEN
    RAISE EXCEPTION 'expired override must restore the AAL2 requirement';
  END IF;
END;
$$;

RESET ROLE;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2a00000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'verified AAL2 admin session must keep access after the override expires';
  END IF;
END;
$$;

RESET ROLE;
ROLLBACK;
