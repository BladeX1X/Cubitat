-- An endpoint is never transferred between accounts, even after deletion.
-- This also protects deliveries already held in an older dispatcher's memory.
CREATE TABLE public.push_endpoint_owners (
  endpoint text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  p256dh text NOT NULL,
  auth text NOT NULL
);
CREATE INDEX push_endpoint_owners_user_idx ON public.push_endpoint_owners(user_id);
ALTER TABLE public.push_endpoint_owners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_endpoint_owners FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.push_endpoint_owners TO service_role;
INSERT INTO public.push_endpoint_owners SELECT endpoint, user_id, p256dh, auth FROM public.push_subscriptions;

CREATE FUNCTION public.enforce_push_endpoint_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.id <> OLD.id OR NEW.endpoint <> OLD.endpoint OR NEW.user_id <> OLD.user_id
      OR NEW.p256dh <> OLD.p256dh OR NEW.auth <> OLD.auth) THEN
    RAISE EXCEPTION 'push_endpoint_immutable' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.push_endpoint_owners(endpoint, user_id, p256dh, auth)
  VALUES (NEW.endpoint, NEW.user_id, NEW.p256dh, NEW.auth) ON CONFLICT DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.push_endpoint_owners o WHERE o.endpoint = NEW.endpoint
      AND o.user_id = NEW.user_id AND o.p256dh = NEW.p256dh AND o.auth = NEW.auth) THEN
    RAISE EXCEPTION 'push_endpoint_immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_push_endpoint_owner() FROM PUBLIC;
CREATE TRIGGER enforce_push_endpoint_owner BEFORE INSERT OR UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.enforce_push_endpoint_owner();
-- Clients must use the authenticated Worker endpoint for registration.
REVOKE INSERT, UPDATE, DELETE ON public.push_subscriptions FROM authenticated;

DELETE FROM public.notification_push_deliveries d USING public.notifications n, public.push_subscriptions s
WHERE d.notification_id = n.id AND d.subscription_id = s.id AND n.user_id <> s.user_id;
ALTER TABLE public.notification_push_deliveries DROP CONSTRAINT notification_push_deliveries_status_check;
ALTER TABLE public.notification_push_deliveries ADD CONSTRAINT notification_push_deliveries_status_check
CHECK (status IN ('pending', 'processing', 'sending', 'sent', 'failed'));

DROP FUNCTION public.claim_pending_push_deliveries(integer);
CREATE FUNCTION public.claim_pending_push_deliveries(p_limit integer DEFAULT 50)
RETURNS TABLE (delivery_id uuid, subscription_id uuid, endpoint text, p256dh text, auth text,
 title text, message text, action_path text, attempts integer, user_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  -- An ambiguous in-flight send is never reclaimed; prefer omission to duplicate disclosure.
  UPDATE public.notification_push_deliveries d SET status = 'failed'
  WHERE (d.status = 'sending' OR (d.status = 'processing' AND d.attempts >= 3))
    AND d.last_attempt_at < now() - interval '10 minutes';
  RETURN QUERY WITH candidates AS (
    SELECT d.id FROM public.notification_push_deliveries d
    JOIN public.push_subscriptions s ON s.id = d.subscription_id
    JOIN public.notifications n ON n.id = d.notification_id AND n.user_id = s.user_id
    WHERE d.attempts < 3 AND (d.status = 'pending' OR
      (d.status = 'processing' AND d.last_attempt_at < now() - interval '10 minutes'))
    ORDER BY d.created_at FOR UPDATE OF d SKIP LOCKED
    LIMIT CASE WHEN p_limit IS NULL THEN 50 WHEN p_limit < 1 THEN 1 WHEN p_limit > 100 THEN 100 ELSE p_limit END
  ), claimed AS (
    UPDATE public.notification_push_deliveries d SET status = 'processing', attempts = d.attempts + 1, last_attempt_at = now()
    FROM candidates c WHERE d.id = c.id RETURNING d.*
  ) SELECT c.id, s.id, s.endpoint, s.p256dh, s.auth, n.title, n.message, n.action_path, c.attempts, n.user_id
  FROM claimed c JOIN public.push_subscriptions s ON s.id = c.subscription_id
  JOIN public.notifications n ON n.id = c.notification_id AND n.user_id = s.user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_pending_push_deliveries(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_pending_push_deliveries(integer) TO service_role;

CREATE FUNCTION public.authorize_push_delivery(p_delivery_id uuid, p_attempt integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  UPDATE public.notification_push_deliveries d SET status = 'sending', last_attempt_at = now()
  FROM public.push_subscriptions s, public.notifications n
  WHERE d.id = p_delivery_id AND d.attempts = p_attempt AND d.status = 'processing'
    AND d.last_attempt_at >= now() - interval '10 minutes'
    AND s.id = d.subscription_id AND n.id = d.notification_id AND s.user_id = n.user_id;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.authorize_push_delivery(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authorize_push_delivery(uuid, integer) TO service_role;
