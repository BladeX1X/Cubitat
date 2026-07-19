-- Harden the existing search-alert trigger without rewriting migration 20260715183000.
-- Notify users once when a property first matches one of their active alerts.
-- Invalid legacy filter values never abort the property publication transaction.

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS event_key text;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_event_key_idx
ON public.notifications (user_id, event_key)
WHERE event_key IS NOT NULL;

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

REVOKE ALL ON FUNCTION public.notify_matching_search_alerts() FROM PUBLIC;

COMMENT ON FUNCTION public.notify_matching_search_alerts() IS
  'Creates idempotent in-app notifications for active search alerts when a property becomes published.';
