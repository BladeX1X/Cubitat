DROP POLICY IF EXISTS "Users can insert their own properties" ON public.properties;

CREATE POLICY "Users can insert their own properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status IN (
    'draft'::public.property_status,
    'pending_review'::public.property_status,
    'ai_approved'::public.property_status,
    'ai_rejected'::public.property_status
  )
);
