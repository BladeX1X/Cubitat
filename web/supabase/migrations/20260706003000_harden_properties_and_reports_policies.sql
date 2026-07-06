-- ==========================================
-- 1. ASEGURAR POLÍTICAS DE LA TABLA PROPERTIES
-- ==========================================

-- Eliminar políticas de actualización e inserción anteriores
DROP POLICY IF EXISTS "Users can insert their own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON public.properties;

-- Nueva política de inserción:
-- Obliga a que el estado sea estrictamente 'draft' o 'pending_review'
CREATE POLICY "Users can insert their own properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND status IN ('draft'::public.property_status, 'pending_review'::public.property_status)
);

-- Nueva política de actualización:
-- Impide que un usuario no-administrador cambie o mantenga el estado a 'published'
CREATE POLICY "Users can update their own properties"
ON public.properties
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- Si el estado final es 'published', requiere que el usuario sea administrador
    CASE 
      WHEN status = 'published'::public.property_status THEN (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'::public.user_role
        )
      )
      ELSE true
    END
  )
);


-- ==========================================
-- 2. ASEGURAR POLÍTICAS DE LA TABLA PROPERTY_REPORTS
-- ==========================================

-- Eliminar política de inserción anterior
DROP POLICY IF EXISTS "Anyone can insert a report" ON public.property_reports;

-- Nueva política de inserción:
-- Fuerza que el estado sea siempre 'pending' al crearse.
-- Valida que el reporter_id coincida con la sesión (si está autenticado) o sea nulo (si es anónimo).
CREATE POLICY "Anyone can insert a report"
ON public.property_reports
FOR INSERT
WITH CHECK (
  status = 'pending'
  AND (
    (auth.uid() IS NULL AND reporter_id IS NULL)
    OR 
    (auth.uid() IS NOT NULL AND reporter_id = auth.uid())
  )
);
