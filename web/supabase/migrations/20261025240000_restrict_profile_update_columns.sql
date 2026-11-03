-- Keep direct profile edits limited to fields the signed-in account can manage.
BEGIN;

REVOKE UPDATE ON TABLE public.profiles
  FROM PUBLIC, anon, authenticated;

REVOKE UPDATE (
  id,
  email,
  full_name,
  role,
  phone,
  created_at,
  updated_at,
  avatar_url,
  phone_verified_at,
  verification_status,
  verification_reason,
  agency_name,
  agency_logo,
  bio,
  license_number,
  public_whatsapp_enabled
)
ON TABLE public.profiles
FROM PUBLIC, anon, authenticated;

GRANT UPDATE (
  full_name,
  phone,
  avatar_url,
  role,
  public_whatsapp_enabled
)
ON TABLE public.profiles
TO authenticated;

COMMIT;
