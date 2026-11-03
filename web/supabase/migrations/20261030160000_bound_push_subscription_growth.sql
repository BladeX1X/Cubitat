-- Bound persistent Push endpoint growth by account while allowing existing
-- devices to refresh their keys/expiry without consuming a new registration.

ALTER TABLE public.push_endpoint_owners
  ADD COLUMN registered_at timestamptz;

-- Existing tombstones have no trustworthy creation timestamp. Keep them for
-- anti-transfer protection, but do not count historical registrations against
-- the new rolling window during rollout.
UPDATE public.push_endpoint_owners
SET registered_at = now() - interval '24 hours' - interval '1 second'
WHERE registered_at IS NULL;

ALTER TABLE public.push_endpoint_owners
  ALTER COLUMN registered_at SET DEFAULT now(),
  ALTER COLUMN registered_at SET NOT NULL;

CREATE INDEX push_endpoint_owners_user_registered_idx
  ON public.push_endpoint_owners (user_id, registered_at DESC);

CREATE FUNCTION public.register_push_subscription(
  p_user_id uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_expiration_time bigint
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  active_subscription public.push_subscriptions%ROWTYPE;
  historical_owner public.push_endpoint_owners%ROWTYPE;
  active_count integer;
  historical_registration_count integer;
  recent_registration_count integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.';
  END IF;

  IF p_user_id IS NULL
     OR p_endpoint IS NULL
     OR pg_catalog.length(p_endpoint) NOT BETWEEN 12 AND 2048
     OR pg_catalog.left(p_endpoint, 8) <> 'https://'
     OR p_p256dh IS NULL
     OR pg_catalog.length(p_p256dh) NOT BETWEEN 16 AND 512
     OR p_auth IS NULL
     OR pg_catalog.length(p_auth) NOT BETWEEN 8 AND 256 THEN
    RETURN 'conflict';
  END IF;

  -- Serialize registration attempts for one account so concurrent requests
  -- cannot both pass the count checks and exceed either limit.
  PERFORM 1 FROM auth.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'conflict';
  END IF;

  SELECT * INTO active_subscription
  FROM public.push_subscriptions
  WHERE endpoint = p_endpoint
  FOR UPDATE;

  IF FOUND THEN
    IF active_subscription.user_id <> p_user_id
       OR active_subscription.p256dh <> p_p256dh
       OR active_subscription.auth <> p_auth THEN
      RETURN 'conflict';
    END IF;

    UPDATE public.push_subscriptions
    SET expiration_time = p_expiration_time,
        updated_at = now()
    WHERE id = active_subscription.id;
    RETURN 'registered';
  END IF;

  SELECT * INTO historical_owner
  FROM public.push_endpoint_owners
  WHERE endpoint = p_endpoint;
  IF FOUND AND (
    historical_owner.user_id <> p_user_id
    OR historical_owner.p256dh <> p_p256dh
    OR historical_owner.auth <> p_auth
  ) THEN
    RETURN 'conflict';
  END IF;

  SELECT pg_catalog.count(*) INTO active_count
  FROM public.push_subscriptions
  WHERE user_id = p_user_id;
  IF active_count >= 10 THEN
    RETURN 'limit_reached';
  END IF;

  SELECT pg_catalog.count(*) INTO historical_registration_count
  FROM public.push_endpoint_owners
  WHERE user_id = p_user_id;
  IF historical_registration_count >= 100 THEN
    RETURN 'limit_reached';
  END IF;

  SELECT pg_catalog.count(*) INTO recent_registration_count
  FROM public.push_endpoint_owners
  WHERE user_id = p_user_id
    AND registered_at > now() - interval '24 hours';
  IF recent_registration_count >= 10 THEN
    RETURN 'limit_reached';
  END IF;

  INSERT INTO public.push_subscriptions (
    user_id, endpoint, p256dh, auth, expiration_time
  ) VALUES (
    p_user_id, p_endpoint, p_p256dh, p_auth, p_expiration_time
  );

  RETURN 'registered';
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_subscription(uuid, text, text, text, bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(uuid, text, text, text, bigint)
  TO service_role;
