-- Conservative server-side duplicate signals for production moderation.

CREATE TABLE IF NOT EXISTS public.property_duplicate_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  duplicate_of uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  reason text NOT NULL DEFAULT 'exact_listing_match',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id),
  CONSTRAINT property_duplicate_flags_distinct_properties CHECK (property_id <> duplicate_of),
  CONSTRAINT property_duplicate_flags_unique_property UNIQUE (property_id)
);
CREATE INDEX IF NOT EXISTS property_duplicate_flags_duplicate_of_idx ON public.property_duplicate_flags (duplicate_of);
ALTER TABLE public.property_duplicate_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins AAL2 read duplicate flags" ON public.property_duplicate_flags;
CREATE POLICY "Admins AAL2 read duplicate flags" ON public.property_duplicate_flags FOR SELECT TO authenticated USING (public.is_admin_aal2());
REVOKE ALL ON public.property_duplicate_flags FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.property_duplicate_flags TO authenticated;

CREATE OR REPLACE FUNCTION public.find_property_duplicate(p_property_id uuid, p_title text, p_location text,
  p_operation public.operation_type, p_property_type public.property_type, p_price_usd numeric, p_area_m2 numeric)
RETURNS TABLE (duplicate_id uuid, fingerprint text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_fingerprint text;
BEGIN
  v_fingerprint := md5(concat_ws('|', regexp_replace(lower(trim(coalesce(p_title, ''))), '[^[:alnum:]]', '', 'g'),
    regexp_replace(lower(trim(coalesce(p_location, ''))), '[^[:alnum:]]', '', 'g'), p_operation::text,
    p_property_type::text, coalesce(p_price_usd::text, ''), coalesce(p_area_m2::text, '')));
  RETURN QUERY SELECT property.id, v_fingerprint FROM public.properties property
  WHERE property.id IS DISTINCT FROM p_property_id
    AND md5(concat_ws('|', regexp_replace(lower(trim(coalesce(property.title, ''))), '[^[:alnum:]]', '', 'g'),
      regexp_replace(lower(trim(coalesce(property.location, ''))), '[^[:alnum:]]', '', 'g'), property.operation::text,
      property.property_type::text, coalesce(property.price_usd::text, ''), coalesce(property.area_m2::text, ''))) = v_fingerprint
    AND property.status::text IN ('published', 'pending_review', 'ai_approved')
  ORDER BY property.created_at ASC, property.id ASC LIMIT 1;
END; $$;
REVOKE ALL ON FUNCTION public.find_property_duplicate(uuid, text, text, public.operation_type, public.property_type, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_property_duplicate(uuid, text, text, public.operation_type, public.property_type, numeric, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_property_duplicate_signal() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_duplicate_id uuid; v_duplicate_notice constant text := 'Posible publicación duplicada. Revisar el anuncio relacionado antes de aprobar.';
BEGIN
  SELECT duplicate_id INTO v_duplicate_id FROM public.find_property_duplicate(NEW.id, NEW.title, NEW.location, NEW.operation, NEW.property_type, NEW.price_usd, NEW.area_m2);
  IF v_duplicate_id IS NOT NULL AND nullif(btrim(coalesce(NEW.moderation_message, '')), '') IS NULL THEN NEW.moderation_message := v_duplicate_notice;
  ELSIF v_duplicate_id IS NULL AND NEW.moderation_message = v_duplicate_notice THEN NEW.moderation_message := NULL; END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.persist_property_duplicate_flag() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_duplicate_id uuid; v_fingerprint text; v_resolved_at timestamptz;
BEGIN
  DELETE FROM public.property_duplicate_flags WHERE property_id = NEW.id;
  SELECT duplicate_id, fingerprint INTO v_duplicate_id, v_fingerprint FROM public.find_property_duplicate(NEW.id, NEW.title, NEW.location, NEW.operation, NEW.property_type, NEW.price_usd, NEW.area_m2);
  IF v_duplicate_id IS NOT NULL THEN
    v_resolved_at := CASE WHEN NEW.status::text IN ('published', 'ai_rejected', 'paused', 'owner_hidden') THEN timezone('utc'::text, now()) ELSE NULL END;
    INSERT INTO public.property_duplicate_flags (property_id, duplicate_of, fingerprint, resolved_at)
    VALUES (NEW.id, v_duplicate_id, v_fingerprint, v_resolved_at)
    ON CONFLICT (property_id) DO UPDATE SET duplicate_of = EXCLUDED.duplicate_of, fingerprint = EXCLUDED.fingerprint,
      resolved_at = EXCLUDED.resolved_at, resolved_by = NULL;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS property_duplicate_signal_before_write ON public.properties;
CREATE TRIGGER property_duplicate_signal_before_write BEFORE INSERT OR UPDATE OF title, location, operation, property_type, price_usd, area_m2, status ON public.properties FOR EACH ROW EXECUTE FUNCTION public.apply_property_duplicate_signal();
DROP TRIGGER IF EXISTS property_duplicate_flag_after_write ON public.properties;
CREATE TRIGGER property_duplicate_flag_after_write AFTER INSERT OR UPDATE OF title, location, operation, property_type, price_usd, area_m2, status ON public.properties FOR EACH ROW EXECUTE FUNCTION public.persist_property_duplicate_flag();
