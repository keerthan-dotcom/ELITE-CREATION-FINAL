-- Add description column to uniforms table (run in Supabase SQL Editor)
ALTER TABLE public.uniforms
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL
  CHECK (char_length(description) <= 100);

-- Refresh Supabase schema cache (required after adding columns)
NOTIFY pgrst, 'reload schema';
