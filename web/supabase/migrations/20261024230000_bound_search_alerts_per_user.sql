-- Bound storage and publication-trigger fan-out from a single authenticated
-- account. Locking per owner serializes concurrent Data API inserts.

CREATE INDEX IF NOT EXISTS search_alerts_user_active_idx
  ON public.search_alerts (user_id)
  WHERE is_active = true;
CREATE OR REPLACE FUNCTION public.enforce_search_alert_quota()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SET search_path = pg_catalog
AS $$
DECLARE
  v_exclude_id uuid := NULL;
  v_total_count bigint;
  v_active_count bigint;
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'A search alert must have an owner.' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_exclude_id := OLD.id;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.user_id::text, 879001)
  );

  SELECT
    pg_catalog.count(*),
    pg_catalog.count(*) FILTER (WHERE alert.is_active)
  INTO v_total_count, v_active_count
  FROM public.search_alerts AS alert
  WHERE alert.user_id = NEW.user_id
    AND alert.id IS DISTINCT FROM v_exclude_id;

  IF v_total_count >= 100 THEN
    RAISE EXCEPTION 'Search alert account limit exceeded.' USING ERRCODE = '54000';
  END IF;

  IF NEW.is_active AND v_active_count >= 20 THEN
    RAISE EXCEPTION 'Active search alert limit exceeded.' USING ERRCODE = '54000';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_search_alert_quota()
  FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS enforce_search_alert_quota ON public.search_alerts;
CREATE TRIGGER enforce_search_alert_quota
BEFORE INSERT OR UPDATE OF user_id, is_active ON public.search_alerts
FOR EACH ROW EXECUTE FUNCTION public.enforce_search_alert_quota();
