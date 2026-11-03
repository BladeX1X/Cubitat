-- Store one immutable agent attribution when a new Auth account is created.
-- Visits, contact attribution, and commission writes remain paused.

CREATE TABLE public.agent_signup_attributions (
  referred_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  referral_code text NOT NULL CHECK (referral_code ~ '^AG-[0-9A-F]{8}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agent_signup_attributions_agent_created_idx
  ON public.agent_signup_attributions (agent_id, created_at DESC);

ALTER TABLE public.agent_signup_attributions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.agent_signup_attributions
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.agent_signup_attributions TO service_role;

CREATE OR REPLACE FUNCTION public.reject_agent_signup_attribution_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'Agent signup attribution is immutable.';
END;
$$;

REVOKE ALL ON FUNCTION public.reject_agent_signup_attribution_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER agent_signup_attributions_immutable
  BEFORE UPDATE OR DELETE ON public.agent_signup_attributions
  FOR EACH ROW EXECUTE FUNCTION public.reject_agent_signup_attribution_mutation();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_referral_code text;
  v_agent_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'buyer'::public.user_role
  );

  v_referral_code := upper(btrim(coalesce(new.raw_user_meta_data->>'referral_code', '')));
  IF v_referral_code ~ '^AG-[0-9A-F]{8}$' THEN
    SELECT link.agent_id
    INTO v_agent_id
    FROM public.agent_referral_links AS link
    JOIN public.profiles AS agent ON agent.id = link.agent_id
    WHERE link.code = v_referral_code
      AND link.active
      AND agent.role IN ('agent'::public.user_role, 'admin'::public.user_role)
      AND agent.verification_status = 'verified'
      AND link.agent_id <> new.id;

    IF v_agent_id IS NOT NULL THEN
      INSERT INTO public.agent_signup_attributions (referred_user_id, agent_id, referral_code)
      VALUES (new.id, v_agent_id, v_referral_code);
    END IF;
  END IF;

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Referral signup links are now an approved capability. Provisioning only
-- returns/creates the caller's active code and never reactivates paused links.
GRANT EXECUTE ON FUNCTION public.ensure_agent_referral_link() TO authenticated;
