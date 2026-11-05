-- F4-REV: optional reputation extension for home services.
-- Review rows retain only the opaque provider UUID; F4-SVC remains independent.
-- Production release migration for the explicit Cubitat production target.

CREATE TABLE public.home_service_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 120),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 20 AND 3000),
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'published', 'rejected', 'hidden', 'withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX home_service_reviews_one_active_author_provider_idx
  ON public.home_service_reviews (provider_id, author_id)
  WHERE status NOT IN ('rejected', 'withdrawn');
CREATE INDEX home_service_reviews_public_provider_idx
  ON public.home_service_reviews (provider_id, created_at DESC)
  WHERE status = 'published';
CREATE INDEX home_service_reviews_moderation_idx
  ON public.home_service_reviews (created_at)
  WHERE status = 'pending_review';

CREATE TABLE public.home_service_review_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.home_service_reviews(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('report', 'withdraw')),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 5 AND 1000),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX home_service_review_flags_one_pending_actor_idx
  ON public.home_service_review_flags (review_id, actor_id, action)
  WHERE status = 'pending';
CREATE INDEX home_service_review_flags_moderation_idx
  ON public.home_service_review_flags (created_at)
  WHERE status = 'pending';

CREATE TABLE public.home_service_review_moderation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.home_service_reviews(id) ON DELETE CASCADE,
  flag_id uuid REFERENCES public.home_service_review_flags(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('publish', 'reject', 'hide', 'resolve_report', 'dismiss_report', 'acknowledge_withdrawal')),
  reason text,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX home_service_review_audit_review_idx
  ON public.home_service_review_moderation_audit (review_id, created_at DESC);

ALTER TABLE public.home_service_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_service_review_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_service_review_moderation_audit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.guard_home_service_review_submission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NEW.author_id <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  SELECT provider.owner_id INTO v_owner_id
    FROM public.home_service_providers provider
    WHERE provider.id = NEW.provider_id AND provider.status = 'published';
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'service_profile_unavailable' USING ERRCODE = '22023';
  END IF;
  IF v_owner_id = NEW.author_id THEN
    RAISE EXCEPTION 'self_review_not_allowed' USING ERRCODE = '42501';
  END IF;
  NEW.status := 'pending_review';
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_home_service_review_submission() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER home_service_review_submission_guard
  BEFORE INSERT ON public.home_service_reviews
  FOR EACH ROW EXECUTE FUNCTION public.guard_home_service_review_submission();

CREATE POLICY home_service_reviews_public_read
  ON public.home_service_reviews FOR SELECT TO anon, authenticated
  USING (status = 'published');
CREATE POLICY home_service_reviews_author_read
  ON public.home_service_reviews FOR SELECT TO authenticated
  USING (author_id = (SELECT auth.uid()));
CREATE POLICY home_service_reviews_admin_read
  ON public.home_service_reviews FOR SELECT TO authenticated
  USING (public.is_admin_aal2());
CREATE POLICY home_service_review_flags_actor_read
  ON public.home_service_review_flags FOR SELECT TO authenticated
  USING (actor_id = (SELECT auth.uid()));
CREATE POLICY home_service_review_flags_admin_read
  ON public.home_service_review_flags FOR SELECT TO authenticated
  USING (public.is_admin_aal2());
CREATE POLICY home_service_review_audit_admin_read
  ON public.home_service_review_moderation_audit FOR SELECT TO authenticated
  USING (public.is_admin_aal2());

REVOKE ALL ON TABLE public.home_service_reviews,
  public.home_service_review_flags,
  public.home_service_review_moderation_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, provider_id, rating, title, body, status, created_at, updated_at)
  ON public.home_service_reviews TO anon, authenticated;
GRANT SELECT ON public.home_service_review_flags TO authenticated;
GRANT SELECT ON public.home_service_review_moderation_audit TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_home_service_review(
  p_provider_id uuid, p_rating smallint, p_title text, p_body text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.home_service_reviews (provider_id, author_id, rating, title, body)
  VALUES (p_provider_id, (SELECT auth.uid()), p_rating, btrim(p_title), btrim(p_body))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_home_service_review(uuid, smallint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_home_service_review(uuid, smallint, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_home_service_review(p_provider_id uuid)
RETURNS TABLE (
  id uuid, provider_id uuid, rating smallint, title text, body text,
  status text, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT review.id, review.provider_id, review.rating, review.title,
    review.body, review.status, review.created_at
  FROM public.home_service_reviews review
  WHERE review.provider_id = p_provider_id
    AND review.author_id = (SELECT auth.uid())
    AND review.status NOT IN ('rejected', 'withdrawn')
  ORDER BY review.created_at DESC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_my_home_service_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_home_service_review(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_home_service_review_queue()
RETURNS TABLE (
  id uuid, provider_id uuid, rating smallint, title text, body text,
  status text, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'admin_aal2_required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT review.id, review.provider_id, review.rating, review.title,
      review.body, review.status, review.created_at
    FROM public.home_service_reviews review
    WHERE review.status IN ('pending_review', 'published')
    ORDER BY (review.status = 'pending_review') DESC, review.created_at ASC
    LIMIT 100;
END;
$$;
REVOKE ALL ON FUNCTION public.get_admin_home_service_review_queue() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_home_service_review_queue() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_home_service_review_flags()
RETURNS TABLE (
  id uuid, review_id uuid, action text, reason text, status text,
  created_at timestamptz, review_title text, review_body text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'admin_aal2_required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT flag.id, flag.review_id, flag.action, flag.reason, flag.status,
      flag.created_at, review.title, review.body
    FROM public.home_service_review_flags flag
    JOIN public.home_service_reviews review ON review.id = flag.review_id
    WHERE flag.status = 'pending'
    ORDER BY flag.created_at ASC
    LIMIT 100;
END;
$$;
REVOKE ALL ON FUNCTION public.get_admin_home_service_review_flags() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_home_service_review_flags() TO authenticated;

CREATE OR REPLACE FUNCTION public.moderate_home_service_review(
  p_review_id uuid, p_action text, p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'admin_aal2_required' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('publish', 'reject', 'hide') THEN
    RAISE EXCEPTION 'invalid_action' USING ERRCODE = '22023';
  END IF;
  IF p_action IN ('reject', 'hide') AND char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 5 AND 500 THEN
    RAISE EXCEPTION 'moderation_reason_required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.home_service_reviews review
    SET status = CASE p_action WHEN 'publish' THEN 'published'
      WHEN 'reject' THEN 'rejected' ELSE 'hidden' END,
      updated_at = now()
    WHERE review.id = p_review_id
      AND ((review.status = 'pending_review' AND p_action IN ('publish', 'reject'))
        OR (review.status = 'published' AND p_action = 'hide'))
      ;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'service_review_not_moderatable' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.home_service_review_moderation_audit
    (review_id, action, reason, actor_id)
  VALUES (p_review_id, p_action, nullif(btrim(p_reason), ''), (SELECT auth.uid()));
END;
$$;
REVOKE ALL ON FUNCTION public.moderate_home_service_review(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_home_service_review(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.report_home_service_review(p_review_id uuid, p_reason text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_flag_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 5 AND 1000 THEN
    RAISE EXCEPTION 'report_reason_required' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.home_service_review_flags (review_id, actor_id, action, reason)
  SELECT review.id, (SELECT auth.uid()), 'report', btrim(p_reason)
  FROM public.home_service_reviews review
  WHERE review.id = p_review_id AND review.status = 'published'
    AND review.author_id <> (SELECT auth.uid())
  RETURNING id INTO v_flag_id;
  IF v_flag_id IS NULL THEN
    RAISE EXCEPTION 'service_review_unavailable' USING ERRCODE = '22023';
  END IF;
  RETURN v_flag_id;
END;
$$;
REVOKE ALL ON FUNCTION public.report_home_service_review(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_home_service_review(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_home_service_review_removal(p_review_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_updated_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 5 AND 1000 THEN
    RAISE EXCEPTION 'removal_reason_required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.home_service_reviews review
    SET status = 'withdrawn', updated_at = now()
    WHERE review.id = p_review_id AND review.author_id = (SELECT auth.uid())
      AND review.status IN ('pending_review', 'published')
    RETURNING review.id INTO v_updated_id;
  IF v_updated_id IS NULL THEN
    RAISE EXCEPTION 'service_review_not_withdrawable' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.home_service_review_flags (review_id, actor_id, action, reason)
  VALUES (v_updated_id, (SELECT auth.uid()), 'withdraw', btrim(p_reason));
END;
$$;
REVOKE ALL ON FUNCTION public.request_home_service_review_removal(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_home_service_review_removal(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_home_service_review_flag(
  p_flag_id uuid, p_action text, p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_review_id uuid;
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'admin_aal2_required' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('resolve_report', 'dismiss_report', 'acknowledge_withdrawal') THEN
    RAISE EXCEPTION 'invalid_action' USING ERRCODE = '22023';
  END IF;
  UPDATE public.home_service_review_flags flag
    SET status = CASE p_action WHEN 'dismiss_report' THEN 'dismissed' ELSE 'resolved' END,
      resolved_at = now(), resolved_by = (SELECT auth.uid())
    WHERE flag.id = p_flag_id AND flag.status = 'pending'
      AND ((flag.action = 'report' AND p_action IN ('resolve_report', 'dismiss_report'))
        OR (flag.action = 'withdraw' AND p_action = 'acknowledge_withdrawal'))
    RETURNING flag.review_id INTO v_review_id;
  IF v_review_id IS NULL THEN
    RAISE EXCEPTION 'service_review_flag_not_resolvable' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.home_service_review_moderation_audit
    (review_id, flag_id, action, reason, actor_id)
  VALUES (v_review_id, p_flag_id, p_action, nullif(btrim(p_reason), ''), (SELECT auth.uid()));
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_home_service_review_flag(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_home_service_review_flag(uuid, text, text) TO authenticated;
