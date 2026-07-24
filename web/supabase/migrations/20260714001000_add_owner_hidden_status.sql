-- Keep voluntary owner withdrawal distinct from administrative moderation.
-- This enum change is isolated so the value is committed before later use.
ALTER TYPE public.property_status ADD VALUE IF NOT EXISTS 'owner_hidden';
