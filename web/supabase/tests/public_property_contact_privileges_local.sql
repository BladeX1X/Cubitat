-- Verify that the private advertiser phone is returned only through the
-- service-role RPC for a published property.
BEGIN;

INSERT INTO auth.users(id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES (
  '8e000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'public-property-contact@local.invalid', '{"full_name":"Contact QA"}', now(), now()
);

INSERT INTO public.properties (
  id, user_id, title, location, description, zone_id, operation,
  property_type, area_m2, status, contact_info
)
VALUES (
  '8e000000-0000-4000-8000-000000000002',
  '8e000000-0000-4000-8000-000000000001',
  'Contacto RPC QA', 'Playa, La Habana',
  'Publicación sintética para probar el canal protegido de contacto.', 'playa',
  'venta', 'casa', 80, 'published', '{"phone":"+53512345678"}'::jsonb
);

DO $$ BEGIN
  IF has_function_privilege('anon', 'public.get_public_property_contact(uuid)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.get_public_property_contact(uuid)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.get_public_property_contact(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'public_property_contact_rpc_grants_invalid';
  END IF;
END $$;

SET LOCAL ROLE service_role;
SET LOCAL request.jwt.claims = '{"role":"service_role"}';
DO $$ DECLARE phone_value text; whatsapp_value text; BEGIN
  SELECT result.phone, result.whatsapp INTO phone_value, whatsapp_value
  FROM public.get_public_property_contact('8e000000-0000-4000-8000-000000000002') AS result;
  IF phone_value <> '+53512345678' OR whatsapp_value <> '+53512345678' THEN
    RAISE EXCEPTION 'published_property_contact_not_returned';
  END IF;
END $$;

RESET ROLE;
ROLLBACK;
