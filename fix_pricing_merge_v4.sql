-- =================================================================
-- FIX PRICING CONSTRAINT (MERGE STRATEGY V4)
-- This script fixes "violates foreign key constraint" errors by
-- merging duplicate references before deleting them.
-- =================================================================

DO $$
DECLARE
    r RECORD;
    survivor_id UUID;
    duplicate_count INTEGER := 0;
BEGIN
    -- 1. Standardize (Ensure we are comparing apples to apples)
    UPDATE public.uniforms SET type = 'Unisex' WHERE type IS NULL;
    UPDATE public.uniforms SET category = 'Regular' WHERE category IS NULL;
    
    ALTER TABLE public.uniforms ALTER COLUMN type SET DEFAULT 'Unisex';
    ALTER TABLE public.uniforms ALTER COLUMN type SET NOT NULL;
    ALTER TABLE public.uniforms ALTER COLUMN category SET DEFAULT 'Regular';
    ALTER TABLE public.uniforms ALTER COLUMN category SET NOT NULL;

    RAISE NOTICE 'Step 1: Standardization Complete';

    -- 2. Loop through groups of duplicates
    FOR r IN 
        SELECT array_agg(id ORDER BY created_at DESC) as ids, 
               school_id, grade, item_name, type, category 
        FROM public.uniforms 
        GROUP BY school_id, grade, item_name, type, category 
        HAVING count(*) > 1
    LOOP
        -- The first ID in the array is the newest one (Survivor)
        survivor_id := r.ids[1];
        
        -- Loop through the rest (Duplicates)
        FOR i IN 2..array_length(r.ids, 1) LOOP
            
            -- A. Move Order references to Survivor
            UPDATE public.order_items 
            SET uniform_id = survivor_id 
            WHERE uniform_id = r.ids[i];
            
            -- B. Delete the duplicate 
            -- (related product_sizes will be auto-deleted via Cascade)
            DELETE FROM public.uniforms WHERE id = r.ids[i];
            
            duplicate_count := duplicate_count + 1;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Step 2: Merged and Deleted % duplicates', duplicate_count;

    -- 3. Add the Constraint
    ALTER TABLE public.uniforms DROP CONSTRAINT IF EXISTS uniforms_unique_key;
    
    ALTER TABLE public.uniforms 
    ADD CONSTRAINT uniforms_unique_key 
    UNIQUE (school_id, grade, item_name, type, category);
        
    RAISE NOTICE 'Step 3: Unique Constraint added successfully.';
END $$;
