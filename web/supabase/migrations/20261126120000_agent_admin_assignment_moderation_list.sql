-- Show administrator accounts that occupy an agent province slot without
-- exposing unrelated admins or allowing the agent-revocation action on them.

DROP FUNCTION public.list_active_agents_for_moderation();

CREATE FUNCTION public.list_active_agents_for_moderation()
RETURNS TABLE (
  agent_id uuid,
  full_name text,
  province text,
  assigned_at timestamptz,
  account_role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'Admin AAL2 required.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    profile.id,
    coalesce(nullif(btrim(profile.full_name), ''), 'Agente sin nombre'),
    coalesce(assignment.province, 'Sin plaza provincial asignada'),
    assignment.assigned_at,
    profile.role::text
  FROM public.profiles AS profile
  LEFT JOIN public.agent_province_assignments AS assignment
    ON assignment.agent_id = profile.id AND assignment.released_at IS NULL
  WHERE profile.role = 'agent'::public.user_role
    OR (
      profile.role = 'admin'::public.user_role
      AND assignment.id IS NOT NULL
    )
  ORDER BY assignment.province, profile.full_name, assignment.assigned_at;
END;
$$;

REVOKE ALL ON FUNCTION public.list_active_agents_for_moderation() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_active_agents_for_moderation() TO authenticated;

COMMENT ON FUNCTION public.list_active_agents_for_moderation() IS
  'Admin AAL2 only: lists agent accounts and administrator accounts with an active province assignment; admin access cannot be revoked through the agent revocation RPC.';

NOTIFY pgrst, 'reload schema';
