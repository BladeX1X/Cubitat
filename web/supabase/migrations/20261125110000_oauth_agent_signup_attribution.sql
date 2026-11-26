-- Attribute eligible new Google accounts to the active referral captured in
-- the same browser session. Existing accounts and other providers are ignored.
CREATE OR REPLACE FUNCTION public.attribute_own_oauth_agent_signup(
  p_referral_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_referral_code text := upper(btrim(coalesce(p_referral_code, '')));
  v_user_created_at timestamptz;
  v_provider text;
  v_agent_id uuid;
  v_inserted integer;
BEGIN
  IF v_user_id IS NULL OR v_referral_code !~ '^AG-[0-9A-F]{8}$' THEN
    RETURN false;
  END IF;

  SELECT auth_user.created_at, auth_user.raw_app_meta_data->>'provider'
    INTO v_user_created_at, v_provider
  FROM auth.users AS auth_user
  WHERE auth_user.id = v_user_id;

  IF NOT FOUND
    OR v_provider IS DISTINCT FROM 'google'
    OR v_user_created_at < statement_timestamp() - interval '15 minutes'
    OR v_user_created_at > statement_timestamp() + interval '1 minute'
    OR NOT EXISTS (
      SELECT 1 FROM public.profiles AS profile
      WHERE profile.id = v_user_id AND profile.role = 'buyer'::public.user_role
    ) THEN
    RETURN false;
  END IF;

  SELECT link.agent_id INTO v_agent_id
  FROM public.agent_referral_links AS link
  JOIN public.profiles AS agent ON agent.id = link.agent_id
  WHERE link.code = v_referral_code
    AND link.active
    AND link.agent_id <> v_user_id
    AND agent.role IN ('agent'::public.user_role, 'admin'::public.user_role)
    AND agent.verification_status = 'verified';

  IF v_agent_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.agent_signup_attributions (referred_user_id, agent_id, referral_code)
  VALUES (v_user_id, v_agent_id, v_referral_code)
  ON CONFLICT (referred_user_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.attribute_own_oauth_agent_signup(text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.attribute_own_oauth_agent_signup(text)
  TO authenticated;
