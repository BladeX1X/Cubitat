-- Queue one notification intent per submitted agent application.
-- The Worker claims rows with service role and sends short-lived signed links.

CREATE TABLE public.agent_application_email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL UNIQUE
    REFERENCES public.agent_applications(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error_code text CHECK (last_error_code IS NULL OR char_length(last_error_code) <= 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'processing' AND claimed_at IS NOT NULL)
    OR (status <> 'processing' AND claimed_at IS NULL)),
  CHECK ((status = 'sent' AND sent_at IS NOT NULL)
    OR (status <> 'sent' AND sent_at IS NULL))
);

CREATE INDEX agent_application_email_outbox_pending_idx
  ON public.agent_application_email_outbox (created_at, id)
  WHERE status IN ('pending', 'processing');

ALTER TABLE public.agent_application_email_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agent_application_email_outbox FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.queue_agent_application_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO public.agent_application_email_outbox (application_id)
  VALUES (NEW.id)
  ON CONFLICT (application_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_agent_application_email() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS queue_agent_application_email ON public.agent_applications;
CREATE TRIGGER queue_agent_application_email
  AFTER INSERT ON public.agent_applications
  FOR EACH ROW EXECUTE FUNCTION public.queue_agent_application_email();

CREATE OR REPLACE FUNCTION public.claim_pending_agent_application_emails(p_limit integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  application_id uuid,
  user_id uuid,
  province text,
  education_title text,
  cv_path text,
  diploma_path text,
  created_at timestamptz,
  attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT outbox.id
    FROM public.agent_application_email_outbox outbox
    WHERE (outbox.status = 'pending'
      OR (outbox.status = 'processing' AND outbox.claimed_at < now() - interval '30 minutes'))
      AND outbox.attempts < 3
    ORDER BY outbox.created_at, outbox.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(coalesce(p_limit, 10), 1), 10)
  ), claimed AS (
    UPDATE public.agent_application_email_outbox outbox
    SET status = 'processing',
        attempts = outbox.attempts + 1,
        claimed_at = now(),
        updated_at = now(),
        last_error_code = NULL
    FROM candidates
    WHERE outbox.id = candidates.id
    RETURNING outbox.id, outbox.application_id, outbox.attempts
  )
  SELECT claimed.id, application.id, application.user_id, application.province,
    application.education_title, application.cv_path, application.diploma_path,
    application.created_at, claimed.attempts
  FROM claimed
  JOIN public.agent_applications application ON application.id = claimed.application_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_agent_application_email(p_outbox_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.agent_application_email_outbox
  SET status = 'sent', sent_at = now(), claimed_at = NULL,
      updated_at = now(), last_error_code = NULL
  WHERE id = p_outbox_id AND status = 'processing';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_agent_application_email(
  p_outbox_id uuid,
  p_error_code text DEFAULT 'delivery_failed'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_updated integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.agent_application_email_outbox
  SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END,
      claimed_at = NULL,
      updated_at = now(),
      last_error_code = left(coalesce(nullif(p_error_code, ''), 'delivery_failed'), 64)
  WHERE id = p_outbox_id AND status = 'processing';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_agent_application_emails(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_agent_application_email(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_agent_application_email(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_agent_application_emails(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_agent_application_email(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_agent_application_email(uuid, text) TO service_role;

COMMENT ON TABLE public.agent_application_email_outbox IS
  'Private service-role-only queue for administrator email about agent applications; CVs and titles are linked, never attached.';

NOTIFY pgrst, 'reload schema';
