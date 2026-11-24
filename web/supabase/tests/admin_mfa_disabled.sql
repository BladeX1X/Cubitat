\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'f2a00000-0000-0000-0000-000000000011',
    'authenticated', 'authenticated', 'mfa-disabled-admin@local.invalid',
    crypt('Local-only-admin-1!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"MFA Disabled Admin QA","role":"buyer"}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f2a00000-0000-0000-0000-000000000012',
    'authenticated', 'authenticated', 'mfa-disabled-buyer@local.invalid',
    crypt('Local-only-buyer-1!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"MFA Disabled Buyer QA","role":"buyer"}', now(), now()
  );

ALTER TABLE public.profiles DISABLE TRIGGER on_profile_role_update;
UPDATE public.profiles SET role = 'admin'::public.user_role
WHERE id = 'f2a00000-0000-0000-0000-000000000011';
ALTER TABLE public.profiles ENABLE TRIGGER on_profile_role_update;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2a00000-0000-0000-0000-000000000011","role":"authenticated","aal":"aal1"}',
  true
);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'admin with aal1 must pass the disabled-MFA admin helper';
  END IF;
END;
$$;

RESET ROLE;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"f2a00000-0000-0000-0000-000000000012","role":"authenticated","aal":"aal1"}',
  true
);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF public.is_admin_aal2() THEN
    RAISE EXCEPTION 'non-admin with aal1 must remain denied';
  END IF;
END;
$$;

RESET ROLE;
ROLLBACK;
