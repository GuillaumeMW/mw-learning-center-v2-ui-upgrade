-- Remove legacy lessons table no longer used by the app
-- This will also drop any dependent FKs/policies referencing it
DROP TABLE IF EXISTS public.lessons CASCADE;