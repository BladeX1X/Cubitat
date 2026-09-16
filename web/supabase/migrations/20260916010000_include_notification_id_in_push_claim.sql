DROP FUNCTION public.claim_pending_push_deliveries(integer);

CREATE FUNCTION public.claim_pending_push_deliveries(p_limit integer DEFAULT 50)
RETURNS TABLE (
  delivery_id uuid,
  notification_id uuid,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  title text,
  message text,
  action_path text,
  attempts integer,
  user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  UPDATE public.notification_push_deliveries d
  SET status = 'failed'
  WHERE (
    d.status = 'sending'
    OR (d.status = 'processing' AND d.attempts >= 3)
  )
    AND d.last_attempt_at < now() - interval '10 minutes';

  RETURN QUERY
  WITH candidates AS (
    SELECT d.id
    FROM public.notification_push_deliveries d
    JOIN public.push_subscriptions s ON s.id = d.subscription_id
    JOIN public.notifications n ON n.id = d.notification_id AND n.user_id = s.user_id
    WHERE d.attempts < 3
      AND (
        d.status = 'pending'
        OR (d.status = 'processing' AND d.last_attempt_at < now() - interval '10 minutes')
      )
    ORDER BY d.created_at
    FOR UPDATE OF d SKIP LOCKED
    LIMIT CASE
      WHEN p_limit IS NULL THEN 50
      WHEN p_limit < 1 THEN 1
      WHEN p_limit > 100 THEN 100
      ELSE p_limit
    END
  ), claimed AS (
    UPDATE public.notification_push_deliveries d
    SET status = 'processing',
        attempts = d.attempts + 1,
        last_attempt_at = now()
    FROM candidates c
    WHERE d.id = c.id
    RETURNING d.*
  )
  SELECT
    c.id,
    c.notification_id,
    s.id,
    s.endpoint,
    s.p256dh,
    s.auth,
    n.title,
    n.message,
    n.action_path,
    c.attempts,
    n.user_id
  FROM claimed c
  JOIN public.push_subscriptions s ON s.id = c.subscription_id
  JOIN public.notifications n ON n.id = c.notification_id AND n.user_id = s.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_push_deliveries(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_pending_push_deliveries(integer) TO service_role;
