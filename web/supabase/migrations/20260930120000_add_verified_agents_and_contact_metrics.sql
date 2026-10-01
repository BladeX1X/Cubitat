-- Verified-agent projections and server-side contact metrics for production.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agency_name text,
  ADD COLUMN IF NOT EXISTS agency_logo text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS license_number text;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS phone_clicks_count bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS whatsapp_clicks_count bigint NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.properties'::regclass
      AND conname = 'properties_phone_clicks_count_nonnegative'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_phone_clicks_count_nonnegative
      CHECK (phone_clicks_count >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.properties'::regclass
      AND conname = 'properties_whatsapp_clicks_count_nonnegative'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_whatsapp_clicks_count_nonnegative
      CHECK (whatsapp_clicks_count >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.property_contact_clicks (
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('phone', 'whatsapp')),
  viewer_key uuid NOT NULL,
  clicked_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, channel, viewer_key, clicked_on)
);

CREATE INDEX IF NOT EXISTS property_contact_clicks_created_idx
  ON public.property_contact_clicks (property_id, created_at DESC);

ALTER TABLE public.property_contact_clicks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.property_contact_clicks FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_contact_clicks(
  p_property_id uuid,
  p_channel text,
  p_viewer_key uuid
)
RETURNS TABLE (phone_clicks_count bigint, whatsapp_clicks_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  IF p_channel NOT IN ('phone', 'whatsapp') THEN
    RAISE EXCEPTION 'Canal de contacto no valido';
  END IF;
  IF p_viewer_key IS NULL THEN
    RAISE EXCEPTION 'Identificador de visitante no valido';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = p_property_id
      AND status = 'published'::public.property_status
  ) THEN
    RAISE EXCEPTION 'Propiedad publica no encontrada';
  END IF;

  INSERT INTO public.property_contact_clicks (property_id, channel, viewer_key)
  VALUES (p_property_id, p_channel, p_viewer_key)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 1 THEN
    UPDATE public.properties AS property
    SET phone_clicks_count = property.phone_clicks_count + CASE WHEN p_channel = 'phone' THEN 1 ELSE 0 END,
        whatsapp_clicks_count = property.whatsapp_clicks_count + CASE WHEN p_channel = 'whatsapp' THEN 1 ELSE 0 END
    WHERE property.id = p_property_id;
  END IF;

  RETURN QUERY
  SELECT property.phone_clicks_count, property.whatsapp_clicks_count
  FROM public.properties AS property
  WHERE property.id = p_property_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_contact_clicks(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_contact_clicks(uuid, text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_verified_agent_ids()
RETURNS TABLE (id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT profiles.id
  FROM public.profiles
  WHERE profiles.role = 'agent'::public.user_role
    AND profiles.verification_status = 'verified'
    AND EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.user_id = profiles.id
        AND properties.status = 'published'::public.property_status
    );
$$;

REVOKE ALL ON FUNCTION public.get_verified_agent_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_verified_agent_ids() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_agent_profile(p_agent_id uuid)
RETURNS TABLE (
  id uuid, full_name text, phone text, agency_name text, agency_logo text,
  bio text, license_number text, verification_status text, created_at timestamptz,
  active_properties_count bigint, reports_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT profiles.id,
    COALESCE(NULLIF(btrim(profiles.full_name), ''), 'Anunciante Cubitat'),
    profiles.phone, profiles.agency_name, profiles.agency_logo, profiles.bio,
    profiles.license_number, profiles.verification_status, profiles.created_at,
    COUNT(DISTINCT published.id),
    COUNT(DISTINCT reports.id) FILTER (WHERE reports.status = 'resolved')
  FROM public.profiles
  JOIN public.properties published
    ON published.user_id = profiles.id
   AND published.status = 'published'::public.property_status
  LEFT JOIN public.properties owned ON owned.user_id = profiles.id
  LEFT JOIN public.property_reports reports ON reports.property_id = owned.id
  WHERE profiles.id = p_agent_id
    AND profiles.role = 'agent'::public.user_role
    AND profiles.verification_status = 'verified'
  GROUP BY profiles.id;
$$;

REVOKE ALL ON FUNCTION public.get_public_agent_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_agent_profile(uuid) TO anon, authenticated;

