-- Índices para optimizar queries frecuentes en properties y profiles

CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties (user_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties (status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);