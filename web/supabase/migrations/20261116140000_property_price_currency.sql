BEGIN;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS price_currency TEXT NOT NULL DEFAULT 'USD';

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_price_currency_check;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_price_currency_check
  CHECK (price_currency IN ('USD', 'CUP', 'MLC'));

COMMENT ON COLUMN public.properties.price_usd IS
  'Numeric amount declared by the advertiser; interpret together with price_currency. Retained name for compatibility.';
COMMENT ON COLUMN public.properties.price_currency IS
  'Currency of price_usd amount: USD, CUP, or MLC. Existing rows default to USD.';

DROP INDEX IF EXISTS public.properties_public_valuation_idx;
CREATE INDEX properties_public_valuation_idx
  ON public.properties (property_type, operation, area_m2, created_at DESC)
  WHERE status = 'published' AND price_currency = 'USD' AND price_usd > 0 AND area_m2 > 0;

CREATE OR REPLACE FUNCTION public.get_property_value_comparables(
  p_property_type text,
  p_operation text,
  p_location text,
  p_area_m2 numeric
)
RETURNS TABLE (
  comparable_id uuid,
  area_m2 numeric,
  price_usd numeric,
  published_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_count integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL
    OR p_property_type IS NULL OR p_property_type NOT IN ('casa', 'apartamento', 'terreno')
    OR p_operation IS NULL OR p_operation NOT IN ('venta', 'alquiler')
    OR char_length(btrim(coalesce(p_location, ''))) NOT BETWEEN 2 AND 120
    OR p_area_m2 IS NULL OR p_area_m2 NOT BETWEEN 10 AND 10000 THEN
    RAISE EXCEPTION 'invalid_valuation_request' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer INTO v_count
  FROM public.properties AS property
  WHERE property.status = 'published'
    AND property.price_currency = 'USD'
    AND property.property_type::text = p_property_type
    AND property.operation::text = p_operation
    AND property.price_usd > 0
    AND property.area_m2 BETWEEN p_area_m2 * 0.70 AND p_area_m2 * 1.30
    AND property.location ILIKE '%' || btrim(p_location) || '%';

  IF v_count < 5 THEN RETURN; END IF;

  RETURN QUERY
  SELECT property.id, property.area_m2, property.price_usd, property.created_at
  FROM public.properties AS property
  WHERE property.status = 'published'
    AND property.price_currency = 'USD'
    AND property.property_type::text = p_property_type
    AND property.operation::text = p_operation
    AND property.price_usd > 0
    AND property.area_m2 BETWEEN p_area_m2 * 0.70 AND p_area_m2 * 1.30
    AND property.location ILIKE '%' || btrim(p_location) || '%'
  ORDER BY abs(property.area_m2 - p_area_m2), property.created_at DESC
  LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.get_property_value_comparables(text, text, text, numeric)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_property_value_comparables(text, text, text, numeric)
  TO authenticated;

-- Legacy numeric price ranges represent USD. Alerts without a range can match any currency.
CREATE OR REPLACE FUNCTION public.notify_matching_search_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  alert_record record;
  alert_zone_id text;
  min_price_str text;
  max_price_str text;
  min_price numeric;
  max_price numeric;
  property_title text;
  searchable_text text;
  matches_alert boolean;
  inserted_rows integer;
BEGIN
  IF NEW.status <> 'published'::public.property_status THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'published'::public.property_status THEN
    RETURN NEW;
  END IF;

  property_title := COALESCE(NULLIF(pg_catalog.btrim(NEW.title), ''), 'Nueva propiedad');
  searchable_text := pg_catalog.lower(
    property_title || ' ' ||
    COALESCE(NEW.location, '') || ' ' ||
    COALESCE(NEW.zone_id, '') || ' ' ||
    COALESCE(NEW.operation::text, '') || ' ' ||
    COALESCE(NEW.property_type::text, '')
  );

  FOR alert_record IN
    SELECT
      id,
      user_id,
      label,
      filters,
      query,
      operation,
      property_type,
      price_range,
      bedrooms,
      bathrooms,
      parking
    FROM public.search_alerts
    WHERE is_active = true
      AND (NEW.user_id IS NULL OR user_id IS DISTINCT FROM NEW.user_id)
  LOOP
    matches_alert := true;

    IF alert_record.operation IS NOT NULL
      AND NEW.operation::text IS DISTINCT FROM alert_record.operation THEN
      matches_alert := false;
    END IF;

    IF matches_alert
      AND alert_record.property_type IS NOT NULL
      AND alert_record.property_type <> 'all'
      AND NEW.property_type::text IS DISTINCT FROM alert_record.property_type THEN
      matches_alert := false;
    END IF;

    IF matches_alert AND alert_record.bedrooms IS NOT NULL AND alert_record.bedrooms <> 'all' THEN
      IF alert_record.bedrooms !~ '^[0-9]+$' THEN
        matches_alert := false;
      ELSIF COALESCE(NEW.bedrooms, -1) < alert_record.bedrooms::integer THEN
        matches_alert := false;
      END IF;
    END IF;

    IF matches_alert AND alert_record.bathrooms IS NOT NULL AND alert_record.bathrooms <> 'all' THEN
      IF alert_record.bathrooms !~ '^[0-9]+$' THEN
        matches_alert := false;
      ELSIF COALESCE(NEW.bathrooms, -1) < alert_record.bathrooms::integer THEN
        matches_alert := false;
      END IF;
    END IF;

    IF matches_alert AND alert_record.parking IS NOT NULL AND alert_record.parking <> 'all' THEN
      IF alert_record.parking !~ '^[0-9]+$' THEN
        matches_alert := false;
      ELSIF COALESCE(NEW.parking, -1) < alert_record.parking::integer THEN
        matches_alert := false;
      END IF;
    END IF;

    IF matches_alert AND alert_record.price_range IS NOT NULL AND alert_record.price_range <> 'all' THEN
      IF NEW.price_currency <> 'USD' THEN
        matches_alert := false;
      END IF;
      min_price_str := pg_catalog.btrim(pg_catalog.split_part(alert_record.price_range, '-', 1));
      max_price_str := pg_catalog.btrim(pg_catalog.split_part(alert_record.price_range, '-', 2));

      IF alert_record.price_range !~ '^[0-9]*(\.[0-9]+)?-[0-9]*(\.[0-9]+)?$'
        OR (min_price_str = '' AND max_price_str = '')
        OR NEW.price_usd IS NULL THEN
        matches_alert := false;
      ELSE
        IF min_price_str <> '' THEN
          min_price := min_price_str::numeric;
          IF NEW.price_usd < min_price THEN
            matches_alert := false;
          END IF;
        END IF;

        IF matches_alert AND max_price_str <> '' THEN
          max_price := max_price_str::numeric;
          IF NEW.price_usd > max_price THEN
            matches_alert := false;
          END IF;
        END IF;
      END IF;
    END IF;

    IF matches_alert THEN
      alert_zone_id := NULLIF(pg_catalog.btrim(alert_record.filters->>'zoneId'), '');
      IF alert_zone_id IS NOT NULL
        AND alert_zone_id <> 'all'
        AND NEW.zone_id IS DISTINCT FROM alert_zone_id THEN
        matches_alert := false;
      END IF;
    END IF;

    IF matches_alert AND NULLIF(pg_catalog.btrim(alert_record.query), '') IS NOT NULL THEN
      IF pg_catalog.strpos(
        searchable_text,
        pg_catalog.lower(pg_catalog.btrim(alert_record.query))
      ) = 0 THEN
        matches_alert := false;
      END IF;
    END IF;

    IF matches_alert THEN
      INSERT INTO public.notifications (user_id, title, message, event_key)
      VALUES (
        alert_record.user_id,
        'Alerta de busqueda coincidente',
        'Se publico una propiedad: "' || property_title || '" que coincide con tu alerta "'
          || COALESCE(NULLIF(pg_catalog.btrim(alert_record.label), ''), 'Busqueda guardada') || '".',
        'search-alert:' || alert_record.id::text || ':property:' || NEW.id::text
      )
      ON CONFLICT (user_id, event_key) WHERE event_key IS NOT NULL DO NOTHING;

      GET DIAGNOSTICS inserted_rows = ROW_COUNT;
      IF inserted_rows > 0 THEN
        UPDATE public.search_alerts
        SET last_sent_at = pg_catalog.now()
        WHERE id = alert_record.id;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_matching_search_alerts ON public.properties;
CREATE TRIGGER notify_matching_search_alerts
AFTER INSERT OR UPDATE OF status ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.notify_matching_search_alerts();

GRANT SELECT (price_currency)
  ON TABLE public.properties TO anon, authenticated, service_role;
GRANT INSERT (price_currency)
  ON TABLE public.properties TO authenticated;
GRANT UPDATE (price_currency)
  ON TABLE public.properties TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
