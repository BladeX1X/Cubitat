-- Allow an AAL2 moderator to revoke an active agent role without deleting the
-- account or its listings. The decision and the released provincial place are
-- recorded atomically.

CREATE TABLE public.agent_role_moderation_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agent_id uuid NOT NULL REFERENCES public.profiles(id),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  province text,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_role_moderation_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agent_role_moderation_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.agent_role_moderation_events TO authenticated;
CREATE POLICY "Admins AAL2 read agent role moderation events"
  ON public.agent_role_moderation_events FOR SELECT TO authenticated
  USING (public.is_admin_aal2());

CREATE OR REPLACE FUNCTION public.prevent_agent_role_moderation_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'Agent role moderation events are immutable.' USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_agent_role_moderation_event_mutation() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER agent_role_moderation_events_immutable
  BEFORE UPDATE OR DELETE ON public.agent_role_moderation_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_agent_role_moderation_event_mutation();

CREATE OR REPLACE FUNCTION public.list_active_agents_for_moderation()
RETURNS TABLE (agent_id uuid, full_name text, province text, assigned_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'Admin AAL2 required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT profile.id, coalesce(nullif(btrim(profile.full_name), ''), 'Agente sin nombre'),
    coalesce(assignment.province, 'Sin plaza provincial asignada'), assignment.assigned_at
  FROM public.profiles AS profile
  LEFT JOIN public.agent_province_assignments AS assignment
    ON assignment.agent_id = profile.id AND assignment.released_at IS NULL
  WHERE profile.role = 'agent'::public.user_role
  ORDER BY assignment.province, profile.full_name, assignment.assigned_at;
END;
$$;
REVOKE ALL ON FUNCTION public.list_active_agents_for_moderation() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_active_agents_for_moderation() TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_agent_access(p_agent_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_reason text := nullif(btrim(p_reason), '');
  v_agent public.profiles%ROWTYPE;
  v_assignment public.agent_province_assignments%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL OR NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'Admin AAL2 required.' USING ERRCODE = '42501';
  END IF;
  IF p_agent_id IS NULL OR v_reason IS NULL OR char_length(v_reason) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Invalid agent revocation request.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_agent
  FROM public.profiles
  WHERE id = p_agent_id
  FOR UPDATE;
  IF NOT FOUND OR v_agent.role IS DISTINCT FROM 'agent'::public.user_role THEN
    RAISE EXCEPTION 'Active agent not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_assignment
  FROM public.agent_province_assignments
  WHERE agent_id = p_agent_id AND released_at IS NULL
  FOR UPDATE;
  INSERT INTO public.agent_role_moderation_events (agent_id, actor_id, province, reason)
  VALUES (p_agent_id, v_actor_id, v_assignment.province, v_reason);

  IF v_assignment.id IS NOT NULL THEN
    UPDATE public.agent_province_assignments
    SET released_at = now(), release_reason = v_reason
    WHERE id = v_assignment.id;
  END IF;

  UPDATE public.profiles
  SET role = 'buyer'::public.user_role
  WHERE id = p_agent_id;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_agent_access(uuid, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_agent_access(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.revoke_agent_access(uuid, text) IS
  'Admin AAL2 only: revokes an active agent role with a required reason, immutable audit event, and provincial slot release; preserves account and listings.';

NOTIFY pgrst, 'reload schema';
