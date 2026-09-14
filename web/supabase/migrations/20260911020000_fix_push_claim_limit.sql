CREATE OR REPLACE FUNCTION public.claim_pending_push_deliveries(p_limit integer DEFAULT 50)
RETURNS TABLE (
  delivery_id uuid,
  subscription_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  title text,
  message text,
  action_path text,
  attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT delivery.id
    FROM public.notification_push_deliveries AS delivery
    WHERE delivery.attempts < 3
      AND (
        delivery.status = 'pending'
        OR (
          delivery.status = 'processing'
          AND delivery.last_attempt_at < pg_catalog.now() - interval '10 minutes'
        )
      )
    ORDER BY delivery.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT pg_catalog.greatest(1, pg_catalog.least(COALESCE(p_limit, 50), 100))
  ), claimed AS (
    UPDATE public.notification_push_deliveries AS delivery
    SET status = 'processing',
        attempts = delivery.attempts + 1,
        last_attempt_at = pg_catalog.now()
    FROM candidates
    WHERE delivery.id = candidates.id
    RETURNING delivery.id, delivery.subscription_id, delivery.notification_id, delivery.attempts
  )
  SELECT
    claimed.id,
    claimed.subscription_id,
    subscription.endpoint,
    subscription.p256dh,
    subscription.auth,
    notification.title,
    notification.message,
    notification.action_path,
    claimed.attempts
  FROM claimed
  JOIN public.push_subscriptions AS subscription ON subscription.id = claimed.subscription_id
  JOIN public.notifications AS notification ON notification.id = claimed.notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_push_deliveries(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_pending_push_deliveries(integer) TO service_role;
