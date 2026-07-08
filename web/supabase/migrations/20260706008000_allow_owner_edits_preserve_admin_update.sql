DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Permitir actualizar mis propiedades siempre" ON public.properties;
DROP POLICY IF EXISTS "Permitir editar mis propiedades sin autopublicar" ON public.properties;

CREATE POLICY "Permitir editar mis propiedades sin autopublicar"
ON public.properties
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status <> 'published'::public.property_status
);

DROP POLICY IF EXISTS "Admin can update any property" ON public.properties;

CREATE POLICY "Admin can update any property"
ON public.properties
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'::public.user_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'::public.user_role
  )
);
