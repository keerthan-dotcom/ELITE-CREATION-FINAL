-- =================================================================
-- FORCE FIX PRICING CONSTRAINT
-- Run this if you are getting "no unique or exclusion constraint" errors
-- =================================================================

-- 1. DELETE DUPLICATE UNIFORM ENTRIES
-- We keep the most recently created item and delete older duplicates
WITH duplicates AS (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY school_id, grade, item_name, type, category
                   ORDER BY created_at DESC
               ) as rnum
        FROM public.uniforms
    ) t
    WHERE t.rnum > 1
)
DELETE FROM public.uniforms
WHERE id IN (SELECT id FROM duplicates);

-- 2. FORCE ADD THE UNIQUE CONSTRAINT
DO $$
BEGIN
    -- Drop it first if it exists in a bad state
    ALTER TABLE public.uniforms DROP CONSTRAINT IF EXISTS uniforms_unique_key;
    
    -- Add it cleanly
    ALTER TABLE public.uniforms 
    ADD CONSTRAINT uniforms_unique_key 
    UNIQUE (school_id, grade, item_name, type, category);
    
    RAISE NOTICE 'Constraint uniforms_unique_key added successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding constraint: %', SQLERRM;
END $$;
