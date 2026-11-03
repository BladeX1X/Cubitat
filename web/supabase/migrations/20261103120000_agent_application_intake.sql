-- Private intake storage and minimal applicant-owned status for Fase 3.
-- Review, signed document access, notification and retention are added separately.

CREATE TABLE IF NOT EXISTS public.agent_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  province text NOT NULL CHECK (province IN (
    'Pinar del Río', 'Artemisa', 'La Habana', 'Mayabeque', 'Matanzas',
    'Cienfuegos', 'Villa Clara', 'Sancti Spíritus', 'Ciego de Ávila',
    'Camagüey', 'Las Tunas', 'Holguín', 'Granma', 'Santiago de Cuba',
    'Guantánamo', 'Isla de la Juventud'
  )),
  education_title text NOT NULL CHECK (char_length(education_title) BETWEEN 2 AND 160),
  experience_summary text CHECK (experience_summary IS NULL OR char_length(experience_summary) <= 1200),
  cv_path text NOT NULL UNIQUE,
  diploma_path text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'reviewing', 'waitlisted', 'approved', 'rejected', 'withdrawn')),
  final_decision_at timestamptz,
  evidence_delete_after timestamptz,
  evidence_purge_claimed_at timestamptz,
  evidence_purged_at timestamptz,
  evidence_purge_attempts integer NOT NULL DEFAULT 0 CHECK (evidence_purge_attempts >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cv_path <> diploma_path),
  CHECK ((status IN ('approved', 'rejected') AND final_decision_at IS NOT NULL)
    OR (status NOT IN ('approved', 'rejected') AND final_decision_at IS NULL)),
  CHECK (evidence_delete_after IS NULL OR final_decision_at IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_applications_one_open_per_user_idx
  ON public.agent_applications (user_id)
  WHERE status IN ('submitted', 'reviewing', 'waitlisted');
CREATE INDEX IF NOT EXISTS agent_applications_review_queue_idx
  ON public.agent_applications (status, created_at, id);
CREATE INDEX IF NOT EXISTS agent_applications_evidence_purge_due_idx
  ON public.agent_applications (evidence_delete_after, id)
  WHERE evidence_purged_at IS NULL;

ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Applicants read own application status" ON public.agent_applications;
CREATE POLICY "Applicants read own application status"
  ON public.agent_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins AAL2 read agent applications" ON public.agent_applications;
CREATE POLICY "Admins AAL2 read agent applications"
  ON public.agent_applications FOR SELECT TO authenticated
  USING (public.is_admin_aal2());
REVOKE ALL ON public.agent_applications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.agent_applications TO authenticated;

CREATE TABLE IF NOT EXISTS public.agent_application_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.agent_applications(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id),
  from_status text,
  to_status text NOT NULL CHECK (to_status IN ('submitted', 'reviewing', 'waitlisted', 'approved', 'rejected', 'withdrawn')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_application_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins AAL2 read application events" ON public.agent_application_events;
CREATE POLICY "Admins AAL2 read application events"
  ON public.agent_application_events FOR SELECT TO authenticated
  USING (public.is_admin_aal2());
REVOKE ALL ON public.agent_application_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.agent_application_events TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_agent_application_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'Agent application events are immutable.' USING ERRCODE = '42501';
END;
$$;
DROP TRIGGER IF EXISTS agent_application_events_immutable ON public.agent_application_events;
CREATE TRIGGER agent_application_events_immutable
  BEFORE UPDATE OR DELETE ON public.agent_application_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_agent_application_event_mutation();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agent_application_documents', 'agent_application_documents', false,
  10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.submit_agent_application_trusted(
  p_application_id uuid,
  p_user_id uuid,
  p_province text,
  p_education_title text,
  p_experience_summary text,
  p_cv_path text,
  p_diploma_path text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;
  IF p_application_id IS NULL OR p_user_id IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id)
    OR p_province NOT IN (
      'Pinar del Río', 'Artemisa', 'La Habana', 'Mayabeque', 'Matanzas',
      'Cienfuegos', 'Villa Clara', 'Sancti Spíritus', 'Ciego de Ávila',
      'Camagüey', 'Las Tunas', 'Holguín', 'Granma', 'Santiago de Cuba',
      'Guantánamo', 'Isla de la Juventud'
    )
    OR p_education_title IS NULL OR char_length(btrim(p_education_title)) NOT BETWEEN 2 AND 160
    OR (p_experience_summary IS NOT NULL AND char_length(p_experience_summary) > 1200)
    OR p_cv_path !~ ('^' || p_user_id::text || '/' || p_application_id::text || '/cv-[0-9a-f-]+[.](pdf|jpg|png)$')
    OR p_diploma_path !~ ('^' || p_user_id::text || '/' || p_application_id::text || '/diploma-[0-9a-f-]+[.](pdf|jpg|png)$')
    OR p_cv_path = p_diploma_path THEN
    RAISE EXCEPTION 'Invalid agent application.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'agent_application_documents' AND name = p_cv_path)
    OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'agent_application_documents' AND name = p_diploma_path) THEN
    RAISE EXCEPTION 'Application documents not found.' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  IF EXISTS (
    SELECT 1 FROM public.agent_applications
    WHERE user_id = p_user_id AND status IN ('submitted', 'reviewing', 'waitlisted')
  ) THEN
    RAISE EXCEPTION 'An active application already exists.' USING ERRCODE = '23505';
  END IF;
  IF (SELECT count(*) FROM public.agent_applications
      WHERE user_id = p_user_id AND created_at >= v_now - interval '24 hours') >= 3 THEN
    RAISE EXCEPTION 'Application submission limit reached.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.agent_applications (
    id, user_id, province, education_title, experience_summary, cv_path, diploma_path
  ) VALUES (
    p_application_id, p_user_id, p_province, btrim(p_education_title),
    nullif(btrim(p_experience_summary), ''), p_cv_path, p_diploma_path
  );
  INSERT INTO public.agent_application_events (application_id, actor_id, to_status, reason)
  VALUES (p_application_id, p_user_id, 'submitted', 'Solicitud recibida');
  RETURN p_application_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_agent_application_trusted(uuid, uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_agent_application_trusted(uuid, uuid, text, text, text, text, text) TO service_role;

COMMENT ON TABLE public.agent_applications IS
  'Private agent application intake. Documents are in a private bucket and accessible only through server-authorized short-lived links.';

NOTIFY pgrst, 'reload schema';
