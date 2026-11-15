-- =================================================================
-- FIX PRICING CONSTRAINT (VERSION 2)
-- Run this to fix "no unique or exclusion constraint matching the ON CONFLICT specification"
-- =================================================================

-- I have renamed the block label to force a refresh in case of caching
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.uniforms ADD CONSTRAINT uniforms_unique_key UNIQUE (school_id, grade, item_name, type, category);
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'Constraint uniforms_unique_key already exists (SKIPPING)';
        WHEN unique_violation THEN
            RAISE NOTICE 'ERROR: Duplicate items found in uniforms table. Constraint cannot be added until they are removed.';
    END;
END $$;
