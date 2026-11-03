-- Assign admitted agents to one primary province with a hard transactional cap.

CREATE TABLE public.agent_province_assignments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.agent_applications(id),
  agent_id uuid NOT NULL REFERENCES public.profiles(id),
  province text NOT NULL CHECK (province IN (
    'Pinar del Río', 'Artemisa', 'La Habana', 'Mayabeque', 'Matanzas',
    'Cienfuegos', 'Villa Clara', 'Sancti Spíritus', 'Ciego de Ávila',
    'Camagüey', 'Las Tunas', 'Holguín', 'Granma', 'Santiago de Cuba',
    'Guantánamo', 'Isla de la Juventud'
  )),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  release_reason text CHECK (release_reason IS NULL OR char_length(release_reason) <= 300),
  CHECK ((released_at IS NULL AND release_reason IS NULL)
    OR (released_at IS NOT NULL AND release_reason IS NOT NULL))
);

CREATE UNIQUE INDEX agent_province_assignments_one_active_agent_idx
  ON public.agent_province_assignments (agent_id)
  WHERE released_at IS NULL;
CREATE UNIQUE INDEX agent_province_assignments_one_active_application_idx
  ON public.agent_province_assignments (application_id)
  WHERE released_at IS NULL;
CREATE INDEX agent_province_assignments_active_province_idx
  ON public.agent_province_assignments (province, agent_id)
  WHERE released_at IS NULL;

ALTER TABLE public.agent_province_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agent_province_assignments FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.require_agent_province_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role
    AND NEW.role = 'agent'::public.user_role
    AND NOT EXISTS (
      SELECT 1 FROM public.agent_province_assignments assignment
      WHERE assignment.agent_id = NEW.id AND assignment.released_at IS NULL
    ) THEN
    RAISE EXCEPTION 'La activación como agente requiere una plaza provincial aprobada.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.require_agent_province_assignment() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS profiles_require_agent_province_assignment ON public.profiles;
CREATE TRIGGER profiles_require_agent_province_assignment
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.require_agent_province_assignment();

CREATE OR REPLACE FUNCTION public.release_agent_province_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM 'agent'::public.user_role
      OR NEW.verification_status IS DISTINCT FROM 'verified')
    AND (OLD.role IS DISTINCT FROM NEW.role
      OR OLD.verification_status IS DISTINCT FROM NEW.verification_status) THEN
    UPDATE public.agent_province_assignments
    SET released_at = now(),
        release_reason = CASE
          WHEN NEW.verification_status IS DISTINCT FROM 'verified' THEN 'Verificación KYC dejó de estar aprobada.'
          ELSE 'El perfil dejó de estar activo como agente.'
        END
    WHERE agent_id = NEW.id AND released_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.release_agent_province_assignment() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS profiles_release_agent_province_assignment ON public.profiles;
CREATE TRIGGER profiles_release_agent_province_assignment
  AFTER UPDATE OF role, verification_status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.release_agent_province_assignment();

DROP FUNCTION public.review_agent_application(uuid, text, text);
CREATE FUNCTION public.review_agent_application(
  p_application_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_current_status text;
  v_target_status text := p_status;
  v_reason text := nullif(btrim(p_reason), '');
  v_now timestamptz := now();
  v_application public.agent_applications%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_active_count integer;
BEGIN
  IF v_actor_id IS NULL OR NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'Admin AAL2 required.' USING ERRCODE = '42501';
  END IF;
  IF p_application_id IS NULL OR p_status IS NULL
    OR p_status NOT IN ('reviewing', 'waitlisted', 'rejected', 'approved')
    OR (v_reason IS NOT NULL AND char_length(v_reason) > 500)
    OR (p_status = 'rejected' AND (v_reason IS NULL OR char_length(v_reason) < 3)) THEN
    RAISE EXCEPTION 'Invalid application review action.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_application
  FROM public.agent_applications
  WHERE id = p_application_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent application not found.' USING ERRCODE = 'P0002';
  END IF;
  v_current_status := v_application.status;
  IF v_current_status NOT IN ('submitted', 'reviewing', 'waitlisted') THEN
    RAISE EXCEPTION 'Application status cannot transition from %.', v_current_status
      USING ERRCODE = '22023';
  END IF;

  IF p_status = 'approved' THEN
    -- Every approval for a province serializes before counting its active assignments.
    PERFORM pg_advisory_xact_lock(hashtextextended('agent-province:' || v_application.province, 0));
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = v_application.user_id
    FOR UPDATE;
    IF NOT FOUND OR v_profile.verification_status IS DISTINCT FROM 'verified' THEN
      RAISE EXCEPTION 'El perfil necesita KYC aprobado antes de activar el rol de agente.'
        USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.agent_province_assignments
      WHERE agent_id = v_application.user_id AND released_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Este perfil ya ocupa una plaza provincial activa.' USING ERRCODE = '23505';
    END IF;

    SELECT count(*) INTO v_active_count
    FROM public.agent_province_assignments
    WHERE province = v_application.province AND released_at IS NULL;
    IF v_active_count >= 4 THEN
      v_target_status := 'waitlisted';
      v_reason := coalesce(v_reason, 'Cupo completo en la provincia; solicitud conservada en lista de espera.');
    ELSE
      INSERT INTO public.agent_province_assignments (application_id, agent_id, province)
      VALUES (v_application.id, v_application.user_id, v_application.province);
      IF v_profile.role = 'buyer'::public.user_role THEN
        UPDATE public.profiles
        SET role = 'agent'::public.user_role
        WHERE id = v_application.user_id;
      END IF;
      v_target_status := 'approved';
    END IF;
  END IF;

  IF v_current_status = v_target_status AND v_target_status <> 'waitlisted' THEN
    RAISE EXCEPTION 'Application status cannot transition from % to %.', v_current_status, v_target_status
      USING ERRCODE = '22023';
  END IF;
  IF v_current_status = 'waitlisted' AND v_target_status = 'waitlisted' THEN
    RETURN v_target_status;
  END IF;

  UPDATE public.agent_applications
  SET status = v_target_status,
      final_decision_at = CASE WHEN v_target_status IN ('approved', 'rejected') THEN v_now ELSE NULL END,
      evidence_delete_after = CASE WHEN v_target_status IN ('approved', 'rejected') THEN v_now + interval '30 days' ELSE NULL END,
      updated_at = v_now
  WHERE id = p_application_id;

  INSERT INTO public.agent_application_events (application_id, actor_id, from_status, to_status, reason, created_at)
  VALUES (p_application_id, v_actor_id, v_current_status, v_target_status, v_reason, v_now);

  RETURN v_target_status;
END;
$$;

REVOKE ALL ON FUNCTION public.review_agent_application(uuid, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.review_agent_application(uuid, text, text) TO authenticated;
COMMENT ON TABLE public.agent_province_assignments IS
  'Auditable primary-province assignments; only active rows consume one of four provincial places.';
COMMENT ON FUNCTION public.review_agent_application(uuid, text, text) IS
  'Admin AAL2 review; approval serializes by province, requires verified KYC and activates only if one of four province slots is available, otherwise waitlists.';

NOTIFY pgrst, 'reload schema';
