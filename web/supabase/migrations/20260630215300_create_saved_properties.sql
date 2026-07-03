-- Create saved_properties table
CREATE TABLE IF NOT EXISTS public.saved_properties (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (user_id, property_id)
);

-- Enable RLS
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view their own saved properties"
  ON public.saved_properties
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save properties"
  ON public.saved_properties
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave properties"
  ON public.saved_properties
  FOR DELETE
  USING (auth.uid() = user_id);
