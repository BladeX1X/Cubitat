-- Only trusted moderation paths should be able to set AI moderation states.
-- Regular owners can create/edit drafts or pending items, but cannot self-approve.

DROP POLICY IF EXISTS "Users can insert their own properties" ON public.properties;

CREATE POLICY "Users can insert their own properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status IN (
    'draft'::public.property_status,
    'pending_review'::public.property_status
  )
);

DROP POLICY IF EXISTS "Permitir editar mis propiedades sin autopublicar" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;

CREATE POLICY "Users can update their own properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status IN (
    'draft'::public.property_status,
    'pending_review'::public.property_status,
    'paused'::public.property_status
  )
);

CREATE OR REPLACE FUNCTION public.set_property_ai_moderation(
  p_property_id uuid,
  p_status public.property_status,
  p_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN (
    'pending_review'::public.property_status,
    'ai_approved'::public.property_status,
    'ai_rejected'::public.property_status
  ) THEN
    RAISE EXCEPTION 'Invalid moderation status.';
  END IF;

  UPDATE public.properties
  SET
    status = p_status,
    moderation_message = p_message,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_property_id
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'::public.user_role
    )
  );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found or not allowed.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_property_ai_moderation(uuid, public.property_status, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_property_ai_moderation(uuid, public.property_status, text) TO authenticated;
