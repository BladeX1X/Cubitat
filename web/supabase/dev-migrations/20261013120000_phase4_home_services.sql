-- F4-SVC: standalone home-service directory and private inquiries.
-- Apply to the explicitly approved Cubitat DEV project only. This migration
-- contains no reviews, materials, B2B entitlements, or valuation objects.

CREATE TABLE public.home_service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 120),
  category text NOT NULL CHECK (category IN (
    'plomeria', 'electricidad', 'carpinteria', 'albanileria', 'pintura',
    'climatizacion', 'limpieza', 'jardineria', 'mudanzas', 'diseno', 'otro'
  )),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 30 AND 5000),
  province text NOT NULL CHECK (char_length(btrim(province)) BETWEEN 2 AND 100),
  municipalities text[] NOT NULL DEFAULT '{}',
  phone text,
  whatsapp text,
  gallery_urls text[] NOT NULL DEFAULT '{}' CHECK (cardinality(gallery_urls) <= 10),
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'published', 'paused', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX home_service_providers_public_idx
  ON public.home_service_providers (province, category, updated_at DESC)
  WHERE status = 'published';
CREATE INDEX home_service_providers_owner_idx
  ON public.home_service_providers (owner_id, updated_at DESC);

CREATE TABLE public.home_service_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.home_service_providers(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 10 AND 3000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX home_service_inquiries_provider_idx
  ON public.home_service_inquiries (provider_id, created_at DESC);
CREATE INDEX home_service_inquiries_sender_idx
  ON public.home_service_inquiries (sender_id, created_at DESC);

CREATE TABLE public.home_service_moderation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.home_service_providers(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('approve', 'reject', 'pause')),
  reason text,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (action = 'approve' OR char_length(btrim(reason)) BETWEEN 5 AND 500)
);
CREATE INDEX home_service_moderation_audit_provider_idx
  ON public.home_service_moderation_audit (provider_id, created_at DESC);

ALTER TABLE public.home_service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_service_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_service_moderation_audit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_public_contactable_home_service(p_provider_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.home_service_providers provider
    WHERE provider.id = p_provider_id AND provider.status = 'published'
      AND provider.owner_id <> (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.is_home_service_provider_owner(p_provider_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.home_service_providers provider
    WHERE provider.id = p_provider_id AND provider.owner_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.is_public_contactable_home_service(uuid),
  public.is_home_service_provider_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_public_contactable_home_service(uuid),
  public.is_home_service_provider_owner(uuid) TO authenticated;

CREATE POLICY home_service_providers_public_read
  ON public.home_service_providers FOR SELECT TO anon, authenticated
  USING (status = 'published');
CREATE POLICY home_service_providers_owner_read
  ON public.home_service_providers FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));
CREATE POLICY home_service_providers_admin_read
  ON public.home_service_providers FOR SELECT TO authenticated
  USING (public.is_admin_aal2());
CREATE POLICY home_service_providers_owner_insert
  ON public.home_service_providers FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()) AND status = 'pending_review');

CREATE POLICY home_service_inquiries_sender_read
  ON public.home_service_inquiries FOR SELECT TO authenticated
  USING (sender_id = (SELECT auth.uid()));
CREATE POLICY home_service_inquiries_provider_read
  ON public.home_service_inquiries FOR SELECT TO authenticated
  USING (public.is_home_service_provider_owner(provider_id));
CREATE POLICY home_service_inquiries_admin_read
  ON public.home_service_inquiries FOR SELECT TO authenticated
  USING (public.is_admin_aal2());
CREATE POLICY home_service_inquiries_sender_insert
  ON public.home_service_inquiries FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND public.is_public_contactable_home_service(provider_id)
  );
CREATE POLICY home_service_moderation_audit_admin_read
  ON public.home_service_moderation_audit FOR SELECT TO authenticated
  USING (public.is_admin_aal2());

CREATE OR REPLACE FUNCTION public.get_my_home_service_providers()
RETURNS TABLE (
  id uuid, slug text, display_name text, category text, description text,
  province text, municipalities text[], phone text, whatsapp text,
  gallery_urls text[], status text, created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
AS $$
  SELECT provider.id, provider.slug, provider.display_name, provider.category,
    provider.description, provider.province, provider.municipalities,
    provider.phone, provider.whatsapp, provider.gallery_urls, provider.status,
    provider.created_at, provider.updated_at
  FROM public.home_service_providers provider
  WHERE provider.owner_id = (SELECT auth.uid())
  ORDER BY provider.updated_at DESC
  LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.get_my_home_service_providers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_home_service_providers() TO authenticated;

CREATE OR REPLACE FUNCTION public.update_home_service_provider(
  p_id uuid, p_display_name text, p_category text, p_description text,
  p_province text, p_municipalities text[], p_phone text, p_whatsapp text,
  p_gallery_urls text[]
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.home_service_providers provider
    SET display_name = btrim(p_display_name), category = p_category,
        description = btrim(p_description), province = btrim(p_province),
        municipalities = coalesce(p_municipalities, '{}'), phone = p_phone,
        whatsapp = p_whatsapp,
        gallery_urls = coalesce(p_gallery_urls, '{}'), updated_at = now(),
        status = CASE WHEN provider.status IN ('rejected', 'paused')
          THEN 'pending_review' ELSE provider.status END
    WHERE provider.id = p_id AND provider.owner_id = (SELECT auth.uid())
      AND provider.status IN ('pending_review', 'rejected', 'paused');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'service_profile_not_editable' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_home_service_provider(
  uuid, text, text, text, text, text[], text, text, text[]
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_home_service_provider(
  uuid, text, text, text, text, text[], text, text, text[]
) TO authenticated;

CREATE OR REPLACE FUNCTION public.moderate_home_service_provider(
  p_provider_id uuid, p_action text, p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT public.is_admin_aal2() THEN
    RAISE EXCEPTION 'admin_aal2_required' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('approve', 'reject', 'pause') THEN
    RAISE EXCEPTION 'invalid_action' USING ERRCODE = '22023';
  END IF;
  IF p_action IN ('reject', 'pause') AND char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 5 AND 500 THEN
    RAISE EXCEPTION 'moderation_reason_required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.home_service_providers provider
    SET status = CASE p_action
          WHEN 'approve' THEN 'published'
          WHEN 'reject' THEN 'rejected'
          ELSE 'paused'
        END,
        updated_at = now()
    WHERE provider.id = p_provider_id
      AND ((provider.status = 'pending_review' AND p_action IN ('approve', 'reject'))
        OR (provider.status = 'published' AND p_action = 'pause'))
    RETURNING provider.status INTO v_status;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'service_profile_not_moderatable' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.home_service_moderation_audit
    (provider_id, action, reason, actor_id)
  VALUES (p_provider_id, p_action, nullif(btrim(p_reason), ''), (SELECT auth.uid()));
END;
$$;
REVOKE ALL ON FUNCTION public.moderate_home_service_provider(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_home_service_provider(uuid, text, text)
  TO authenticated;

REVOKE ALL ON TABLE public.home_service_providers,
  public.home_service_inquiries, public.home_service_moderation_audit
  FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, slug, display_name, category, description, province,
  municipalities, phone, whatsapp, gallery_urls, status, created_at, updated_at)
  ON public.home_service_providers TO anon, authenticated;
GRANT INSERT (owner_id, slug, display_name, category, description, province,
  municipalities, phone, whatsapp, gallery_urls)
  ON public.home_service_providers TO authenticated;
GRANT SELECT ON public.home_service_inquiries TO authenticated;
GRANT INSERT (provider_id, sender_id, message)
  ON public.home_service_inquiries TO authenticated;
GRANT SELECT ON public.home_service_moderation_audit TO authenticated;
