-- Production search-alert email queue. Sending is server-only and idempotent.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS email_delivery_status text DEFAULT 'not_applicable' NOT NULL,
  ADD COLUMN IF NOT EXISTS email_attempts integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS email_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND conname = 'notifications_email_delivery_status_check'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_email_delivery_status_check
      CHECK (email_delivery_status IN ('not_applicable', 'pending', 'processing', 'sent', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS notifications_pending_email_idx
  ON public.notifications (created_at)
  WHERE email_delivery_status = 'pending';

CREATE OR REPLACE FUNCTION public.prepare_search_alert_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.event_key LIKE 'search-alert:%' THEN
    NEW.email_delivery_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prepare_search_alert_email ON public.notifications;
CREATE TRIGGER prepare_search_alert_email
BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.prepare_search_alert_email();

CREATE OR REPLACE FUNCTION public.claim_pending_alert_emails(p_limit integer DEFAULT 50)
RETURNS TABLE (id uuid, user_id uuid, title text, message text, email_attempts integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT n.id
    FROM public.notifications n
    WHERE (n.email_delivery_status = 'pending'
      OR (n.email_delivery_status = 'processing'
        AND n.email_last_attempt_at < now() - interval '30 minutes'))
      AND n.email_attempts < 3
    ORDER BY n.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
  )
  UPDATE public.notifications n
  SET email_delivery_status = 'processing',
      email_attempts = n.email_attempts + 1,
      email_last_attempt_at = now()
  FROM candidates
  WHERE n.id = candidates.id
  RETURNING n.id, n.user_id, n.title, n.message, n.email_attempts;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_search_alert_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_pending_alert_emails(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_alert_emails(integer) TO service_role;

NOTIFY pgrst, 'reload schema';
