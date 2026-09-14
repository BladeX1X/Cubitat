CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  expiration_time bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_https CHECK (
    pg_catalog.length(endpoint) BETWEEN 12 AND 2048
    AND pg_catalog.left(endpoint, 8) = 'https://'
  ),
  CONSTRAINT push_subscriptions_key_lengths CHECK (
    pg_catalog.length(p256dh) BETWEEN 16 AND 512
    AND pg_catalog.length(auth) BETWEEN 8 AND 256
  )
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions (user_id, updated_at DESC);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_select_own
ON public.push_subscriptions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subscriptions_insert_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_insert_own
ON public.push_subscriptions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subscriptions_update_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_update_own
ON public.push_subscriptions FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_subscriptions_delete_own ON public.push_subscriptions;
CREATE POLICY push_subscriptions_delete_own
ON public.push_subscriptions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_push_subscription()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_push_subscription ON public.push_subscriptions;
CREATE TRIGGER touch_push_subscription
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.touch_push_subscription();

REVOKE ALL ON FUNCTION public.touch_push_subscription() FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.notification_push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, subscription_id)
);

CREATE INDEX IF NOT EXISTS notification_push_pending_idx
  ON public.notification_push_deliveries (status, created_at)
  WHERE status IN ('pending', 'processing');

ALTER TABLE public.notification_push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_push_deliveries FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_notification_push_deliveries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO public.notification_push_deliveries (notification_id, subscription_id)
  SELECT NEW.id, subscription.id
  FROM public.push_subscriptions AS subscription
  WHERE subscription.user_id = NEW.user_id
  ON CONFLICT (notification_id, subscription_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enqueue_notification_push_deliveries ON public.notifications;
CREATE TRIGGER enqueue_notification_push_deliveries
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.enqueue_notification_push_deliveries();

REVOKE ALL ON FUNCTION public.enqueue_notification_push_deliveries() FROM PUBLIC;

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
    LIMIT pg_catalog.greatest(1, pg_catalog.least(pg_catalog.coalesce(p_limit, 50), 100))
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

COMMENT ON TABLE public.push_subscriptions IS
  'One standards-based Web Push subscription per browser installation.';
COMMENT ON TABLE public.notification_push_deliveries IS
  'Per-device delivery queue for Cubitat notifications.';
