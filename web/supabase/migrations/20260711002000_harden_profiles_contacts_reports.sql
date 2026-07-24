-- Security audit follow-up: minimize profile exposure and harden public forms.

-- Reconcile production drift from an earlier manual contacts-table deployment.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS referral_id text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'direct';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'::public.user_role
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Allow authenticated read for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are readable by owner or admin" ON public.profiles;

CREATE POLICY "Profiles are readable by owner or admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Allow public insert for contacts" ON public.contacts;

CREATE POLICY "Allow validated contacts for published properties"
ON public.contacts
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.properties
    WHERE properties.id = contacts.property_id
      AND properties.status = 'published'::public.property_status
  )
  AND char_length(btrim(contact_name)) BETWEEN 2 AND 120
  AND char_length(btrim(contact_phone)) BETWEEN 6 AND 40
  AND char_length(btrim(message)) BETWEEN 5 AND 2000
  AND (referral_id IS NULL OR char_length(referral_id) <= 120)
  AND (source IS NULL OR char_length(source) <= 40)
);

DROP POLICY IF EXISTS "Allow read for owners and admins" ON public.contacts;

CREATE POLICY "Allow read for owners and admins"
ON public.contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.properties
    WHERE properties.id = contacts.property_id
      AND properties.user_id = auth.uid()
  )
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Anyone can insert a report" ON public.property_reports;

CREATE POLICY "Anyone can insert a report"
ON public.property_reports
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND char_length(btrim(reason)) BETWEEN 2 AND 80
  AND (description IS NULL OR char_length(description) <= 2000)
  AND (
    (auth.uid() IS NULL AND reporter_id IS NULL)
    OR (auth.uid() IS NOT NULL AND reporter_id = auth.uid())
  )
  AND EXISTS (
    SELECT 1
    FROM public.properties
    WHERE properties.id = property_reports.property_id
      AND properties.status = 'published'::public.property_status
  )
);

CREATE OR REPLACE FUNCTION public.handle_new_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_property_title text;
BEGIN
  SELECT user_id, title
  INTO v_owner_id, v_property_title
  FROM public.properties
  WHERE id = NEW.property_id;

  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      v_owner_id,
      'Interés en tu propiedad',
      NEW.contact_name || ' te ha enviado un mensaje por "' || v_property_title || '". Tel: ' || NEW.contact_phone
    );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_contact() FROM PUBLIC;

CREATE INDEX IF NOT EXISTS idx_contacts_property_created
  ON public.contacts (property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_reports_property_created
  ON public.property_reports (property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_reports_reporter
  ON public.property_reports (reporter_id)
  WHERE reporter_id IS NOT NULL;
