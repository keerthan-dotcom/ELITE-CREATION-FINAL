-- Fix for missing school_code and status columns in schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS school_code TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Optional: Update existing rows to have a default code if null
UPDATE public.schools SET school_code = UPPER(SUBSTRING(name, 1, 3)) WHERE school_code IS NULL;
