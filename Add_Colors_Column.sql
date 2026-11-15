-- Add colors JSONB column to uniforms table
-- Each entry: { name: string, hex: string, image_url: string | null }
ALTER TABLE public.uniforms
  ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT NULL;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
