-- =================================================================
-- FIX PRICING CONSTRAINT (FINAL VERSION 3)
-- This script fixes the "no unique or exclusion constraint" error 
-- by ensuring data integrity and enforcing strictly defined constraints.
-- =================================================================

BEGIN;

-- 1. CLEANUP NULLS
-- Replace NULLs with defaults to ensure Unique Constraint works predictably
UPDATE public.uniforms SET type = 'Unisex' WHERE type IS NULL;
UPDATE public.uniforms SET category = 'Regular' WHERE category IS NULL;

-- 2. ENFORCE NOT NULL
-- This prevents future NULLs which can cause issues with composite unique keys in some ORMs
ALTER TABLE public.uniforms ALTER COLUMN type SET DEFAULT 'Unisex';
ALTER TABLE public.uniforms ALTER COLUMN type SET NOT NULL;

ALTER TABLE public.uniforms ALTER COLUMN category SET DEFAULT 'Regular';
ALTER TABLE public.uniforms ALTER COLUMN category SET NOT NULL;

-- 3. DELETE DUPLICATES
-- A more aggressive deduplication strategy
DELETE FROM public.uniforms a USING public.uniforms b
WHERE a.id < b.id
  AND a.school_id = b.school_id
  AND a.grade = b.grade
  AND a.item_name = b.item_name
  AND a.type = b.type
  AND a.category = b.category;

-- 4. RE-CREATE CONSTRAINT
-- We drop any potential existing partial constraints
ALTER TABLE public.uniforms DROP CONSTRAINT IF EXISTS uniforms_unique_key;

-- Add the constraints explicitly
ALTER TABLE public.uniforms 
ADD CONSTRAINT uniforms_unique_key 
UNIQUE (school_id, grade, item_name, type, category);

COMMIT;

-- 5. VERIFICATION QUERY
-- This will show if the constraint exists
SELECT 
    conname as constraint_name, 
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.uniforms'::regclass
AND conname = 'uniforms_unique_key';
