-- Crear tabla de reportes de propiedades sospechosas
CREATE TABLE IF NOT EXISTS public.property_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.property_reports ENABLE ROW LEVEL SECURITY;

-- Política: Cualquier usuario (registrado o anónimo) puede enviar reportes
CREATE POLICY "Anyone can insert a report"
ON public.property_reports
FOR INSERT
WITH CHECK (true);

-- Política: Solo administradores pueden leer los reportes
CREATE POLICY "Admins can read all reports"
ON public.property_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Solo administradores pueden actualizar los reportes (ej. resolver/descartar)
CREATE POLICY "Admins can update all reports"
ON public.property_reports
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
