-- ==========================================
-- FINAL DATABASE FIX SCRIPT
-- Run this in the Supabase SQL Editor
-- ==========================================

-- 1. DEDUPLICATE: Keep only the LATEST entry for every (school, grade, item, type, category) combination
-- This fixes the issue where you have multiple rows for the same thing.
DELETE FROM uniforms a 
USING uniforms b 
WHERE a.id < b.id 
AND a.school_id = b.school_id 
AND a.grade IS NOT DISTINCT FROM b.grade 
AND a.item_name IS NOT DISTINCT FROM b.item_name 
AND a.type IS NOT DISTINCT FROM b.type 
AND a.category IS NOT DISTINCT FROM b.category;

-- 2. CLEANUP ORPHANS: Remove Class-Specific prices that don't have a Master ('All') item
-- This fixes "Ghost" items that appear in the shop but not in the Admin panel.
-- (e.g. if you deleted "Shirt" from Admin, but "Class 1 - Shirt" remained).
DELETE FROM uniforms u
WHERE u.grade != 'All'
AND NOT EXISTS (
    SELECT 1 FROM uniforms master
    WHERE master.school_id = u.school_id
    AND master.grade = 'All'
    AND master.item_name = u.item_name
    AND master.type = u.type
    AND master.category = u.category
);

-- 3. ENFORCE CONSTRAINT: Make it impossible to create duplicates again
DROP INDEX IF EXISTS idx_uniforms_unique_entry;
CREATE UNIQUE INDEX idx_uniforms_unique_entry 
ON uniforms (school_id, grade, item_name, type, category);

-- 4. VERIFY
SELECT school_id, grade, item_name, count(*) 
FROM uniforms 
GROUP BY school_id, grade, item_name, type, category 
HAVING count(*) > 1;
-- The result of step 4 should be EMPTY (No rows).
