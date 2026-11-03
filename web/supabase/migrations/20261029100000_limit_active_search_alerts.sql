-- Harden the quota guard from 20261024230000 without installing a second
-- trigger or duplicate partial index. The existing trigger already caps each
-- account at 20 active and 100 total rows; bound lock waits under contention.
DROP TRIGGER IF EXISTS enforce_search_alert_active_limit ON public.search_alerts;
DROP FUNCTION IF EXISTS public.enforce_search_alert_active_limit();
DROP INDEX IF EXISTS public.search_alerts_active_user_idx;

CREATE INDEX IF NOT EXISTS search_alerts_user_active_idx
  ON public.search_alerts (user_id)
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.enforce_search_alert_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_active_count bigint;
  v_total_count bigint;
  v_previous_lock_timeout text := pg_catalog.current_setting('lock_timeout');
BEGIN
  IF TG_OP = 'UPDATE'
    AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
    AND NEW.is_active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  PERFORM pg_catalog.set_config('lock_timeout', '2s', true);
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('search-alert-quota:' || NEW.user_id::text, 0)
  );
  PERFORM pg_catalog.set_config('lock_timeout', v_previous_lock_timeout, true);

  IF TG_OP = 'UPDATE' THEN
    SELECT
      count(*),
      count(*) FILTER (WHERE is_active = true)
    INTO v_total_count, v_active_count
    FROM public.search_alerts
    WHERE user_id = NEW.user_id
      AND id <> OLD.id;
  ELSE
    SELECT
      count(*),
      count(*) FILTER (WHERE is_active = true)
    INTO v_total_count, v_active_count
    FROM public.search_alerts
    WHERE user_id = NEW.user_id;
  END IF;

  IF NEW.is_active IS TRUE AND v_active_count >= 20 THEN
    RAISE EXCEPTION 'search_alert_active_limit_exceeded'
      USING ERRCODE = '54000';
  END IF;

  IF v_total_count >= 100 THEN
    RAISE EXCEPTION 'search_alert_total_limit_exceeded'
      USING ERRCODE = '54000';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_search_alert_quota()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS enforce_search_alert_quota ON public.search_alerts;
CREATE TRIGGER enforce_search_alert_quota
BEFORE INSERT OR UPDATE OF user_id, is_active ON public.search_alerts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_search_alert_quota();

COMMENT ON FUNCTION public.enforce_search_alert_quota() IS
  'Serializes search alert writes; caps each owner at 20 active and 100 total alerts with a bounded lock wait.';
