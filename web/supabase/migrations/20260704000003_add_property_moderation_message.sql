ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS moderation_message TEXT;
