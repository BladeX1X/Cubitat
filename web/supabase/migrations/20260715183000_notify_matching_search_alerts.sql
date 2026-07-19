CREATE OR REPLACE FUNCTION public.notify_matching_search_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_record record;
  alert_zone_id text;
  min_price_str text;
  max_price_str text;
  min_price numeric;
  max_price numeric;
  property_title text;
  property_location text;
  searchable_text text;
  matches_alert boolean;
BEGIN
  IF NEW.status <> 'published'::public.property_status THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'published'::public.property_status THEN
      RETURN NEW;
    END IF;
  END IF;

  property_title := COALESCE(NULLIF(trim(NEW.title), ''), 'Nueva propiedad');
  property_location := COALESCE(NEW.location, '');
  searchable_text := lower(property_title || ' ' || property_location || ' ' || NEW.zone_id || ' ' || NEW.operation::text || ' ' || NEW.property_type::text);

  FOR alert_record IN
    SELECT *
    FROM public.search_alerts
    WHERE is_active = true
      AND (NEW.user_id IS NULL OR user_id <> NEW.user_id)
  LOOP
    matches_alert := true;

    IF alert_record.operation IS NOT NULL THEN
      IF NEW.operation::text <> alert_record.operation THEN
        matches_alert := false;
      END IF;
    END IF;

    IF matches_alert AND alert_record.property_type IS NOT NULL AND alert_record.property_type <> 'all' THEN
      IF NEW.property_type::text <> alert_record.property_type THEN
        matches_alert := false;
      END IF;
    END IF;

    IF matches_alert AND alert_record.bedrooms IS NOT NULL AND alert_record.bedrooms <> 'all' THEN
      IF NEW.bedrooms < alert_record.bedrooms::integer THEN
        matches_alert := false;
      END IF;
    END IF;

    IF matches_alert AND alert_record.bathrooms IS NOT NULL AND alert_record.bathrooms <> 'all' THEN
      IF NEW.bathrooms < alert_record.bathrooms::integer THEN
        matches_alert := false;
      END IF;
    END IF;

    IF matches_alert AND alert_record.parking IS NOT NULL AND alert_record.parking <> 'all' THEN
      IF NEW.parking < alert_record.parking::integer THEN
        matches_alert := false;
      END IF;
    END IF;

    IF matches_alert AND alert_record.price_range IS NOT NULL AND alert_record.price_range <> 'all' THEN
      min_price_str := split_part(alert_record.price_range, '-', 1);
      max_price_str := split_part(alert_record.price_range, '-', 2);

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

    IF matches_alert THEN
      alert_zone_id := alert_record.filters->>'zoneId';
      IF alert_zone_id IS NOT NULL AND alert_zone_id <> 'all' THEN
        IF NEW.zone_id <> alert_zone_id THEN
          matches_alert := false;
        END IF;
      END IF;
    END IF;

    IF matches_alert AND alert_record.query IS NOT NULL AND trim(alert_record.query) <> '' THEN
      IF position(lower(trim(alert_record.query)) in searchable_text) = 0 THEN
        matches_alert := false;
      END IF;
    END IF;

    IF matches_alert THEN
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (
        alert_record.user_id,
        'Alerta de búsqueda coincidente',
        'Se ha publicado una nueva propiedad: "' || property_title || '" que coincide con tu alerta "' || alert_record.label || '".'
      );

      UPDATE public.search_alerts
      SET last_sent_at = now()
      WHERE id = alert_record.id;
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
