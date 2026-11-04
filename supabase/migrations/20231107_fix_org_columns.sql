-- Add missing columns to public.organisations
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS tax_id text;

-- CRITICAL: Tell PostgREST and Supasheet to reload their schema cache
NOTIFY pgrst, 'reload schema';
SELECT supasheet.refresh_metadata();