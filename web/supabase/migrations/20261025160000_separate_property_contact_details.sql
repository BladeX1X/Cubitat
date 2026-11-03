-- Keep advertiser contact details out of the public properties projection.
-- The legacy JSON column remains for backwards-compatible writes, but the
-- trigger moves its contents to an owner-protected table and clears the JSON.

CREATE TABLE IF NOT EXISTS public.property_contact_details (
  property_id uuid PRIMARY KEY
    REFERENCES public.properties(id) ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED,
  name text,
  phone text,
  email text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_contact_details_value_size CHECK (
    (name IS NULL OR octet_length(name) <= 480)
    AND (phone IS NULL OR octet_length(phone) <= 64)
    AND (email IS NULL OR octet_length(email) <= 1020)
  )
);

ALTER TABLE public.property_contact_details ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.property_contact_details FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.property_contact_details TO authenticated, service_role;

DROP POLICY IF EXISTS "Owners manage their property contact details" ON public.property_contact_details;
CREATE POLICY "Owners manage their property contact details"
ON public.property_contact_details
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.properties AS property
    WHERE property.id = property_contact_details.property_id
      AND property.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.properties AS property
    WHERE property.id = property_contact_details.property_id
      AND property.user_id = (SELECT auth.uid())
  )
);

-- Move the existing values before installing the write-through trigger.
INSERT INTO public.property_contact_details (property_id, name, phone, email)
SELECT
  property.id,
  NULLIF(btrim(property.contact_info->>'name'), ''),
  NULLIF(btrim(property.contact_info->>'phone'), ''),
  NULLIF(btrim(property.contact_info->>'email'), '')
FROM public.properties AS property
WHERE jsonb_typeof(property.contact_info) = 'object'
  AND property.contact_info <> '{}'::jsonb
ON CONFLICT (property_id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  updated_at = now();

UPDATE public.properties
SET contact_info = '{}'::jsonb
WHERE contact_info IS DISTINCT FROM '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.store_private_property_contact_details()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_contact jsonb := COALESCE(NEW.contact_info, '{}'::jsonb);
  v_name text;
  v_phone text;
  v_email text;
BEGIN
  IF jsonb_typeof(v_contact) <> 'object' THEN
    RAISE EXCEPTION 'Property contact details must be an object.' USING ERRCODE = '22023';
  END IF;

  v_name := NULLIF(btrim(v_contact->>'name'), '');
  v_phone := NULLIF(btrim(v_contact->>'phone'), '');
  v_email := NULLIF(btrim(v_contact->>'email'), '');

  IF (v_name IS NOT NULL AND octet_length(v_name) > 480)
    OR (v_phone IS NOT NULL AND octet_length(v_phone) > 64)
    OR (v_email IS NOT NULL AND octet_length(v_email) > 1020) THEN
    RAISE EXCEPTION 'Property contact details exceed the allowed size.' USING ERRCODE = '22023';
  END IF;

  IF v_name IS NULL AND v_phone IS NULL AND v_email IS NULL THEN
    DELETE FROM public.property_contact_details WHERE property_id = NEW.id;
  ELSE
    INSERT INTO public.property_contact_details (property_id, name, phone, email, updated_at)
    VALUES (NEW.id, v_name, v_phone, v_email, now())
    ON CONFLICT (property_id) DO UPDATE SET
      name = EXCLUDED.name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      updated_at = now();
  END IF;

  NEW.contact_info := '{}'::jsonb;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_private_property_contact_details ON public.properties;
CREATE TRIGGER store_private_property_contact_details
BEFORE INSERT OR UPDATE OF contact_info ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.store_private_property_contact_details();

REVOKE ALL ON FUNCTION public.store_private_property_contact_details()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_admin_property_contact_details(p_property_ids uuid[])
RETURNS TABLE(property_id uuid, contact_info jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT
    detail.property_id,
    jsonb_strip_nulls(jsonb_build_object(
      'name', detail.name,
      'phone', detail.phone,
      'email', detail.email
    ))
  FROM public.property_contact_details AS detail
  WHERE detail.property_id = ANY(COALESCE(p_property_ids, ARRAY[]::uuid[]))
    AND public.is_admin_aal2()
$$;

REVOKE ALL ON FUNCTION public.get_admin_property_contact_details(uuid[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_property_contact_details(uuid[])
  TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.submit_public_contact_trusted(uuid, text, text, text, text, uuid);
CREATE FUNCTION public.submit_public_contact_trusted(
  p_property_id uuid,
  p_contact_name text,
  p_contact_phone text,
  p_message text,
  p_referral_code text,
  p_contact_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_contact_id uuid;
  v_referral_code text;
  v_contact_details jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;

  p_contact_name := btrim(p_contact_name);
  p_contact_phone := btrim(p_contact_phone);
  p_message := btrim(p_message);
  IF p_contact_name IS NULL OR p_contact_phone IS NULL OR p_message IS NULL
    OR char_length(p_contact_name) NOT BETWEEN 2 AND 120
    OR char_length(p_contact_phone) NOT BETWEEN 6 AND 40
    OR char_length(p_message) NOT BETWEEN 5 AND 2000 THEN
    RAISE EXCEPTION 'Invalid contact submission.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.properties AS property
    WHERE property.id = p_property_id
      AND property.status = 'published'::public.property_status
  ) THEN
    RAISE EXCEPTION 'Published property not found.' USING ERRCODE = '22023';
  END IF;

  SELECT link.code INTO v_referral_code
  FROM public.agent_referral_links AS link
  JOIN public.profiles AS agent ON agent.id = link.agent_id
  WHERE link.code = upper(btrim(COALESCE(p_referral_code, '')))
    AND link.active
    AND agent.role IN ('agent'::public.user_role, 'admin'::public.user_role)
    AND agent.verification_status = 'verified'
    AND (p_contact_user_id IS NULL OR p_contact_user_id <> link.agent_id)
  LIMIT 1;

  INSERT INTO public.contacts (
    property_id, contact_name, contact_phone, message, referral_id, source
  ) VALUES (
    p_property_id, p_contact_name, p_contact_phone, p_message,
    v_referral_code,
    CASE WHEN v_referral_code IS NULL THEN 'detail' ELSE 'agent_referral' END
  ) RETURNING id INTO v_contact_id;

  SELECT jsonb_strip_nulls(jsonb_build_object('phone', detail.phone))
    INTO v_contact_details
  FROM public.property_contact_details AS detail
  WHERE detail.property_id = p_property_id;

  RETURN jsonb_build_object(
    'contact_id', v_contact_id,
    'contact_info', COALESCE(v_contact_details, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_contact_trusted(uuid, text, text, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_contact_trusted(uuid, text, text, text, text, uuid)
  TO service_role;
