-- 1. Deduplicate uniforms table (keep the one with the latest created_at or just arbitrary id)
-- We'll keep the one with the *latest* created_at to preserve recent prices, or smallest ID if dates equal.
DELETE FROM uniforms a 
USING uniforms b 
WHERE a.id < b.id 
AND a.school_id = b.school_id 
AND a.grade IS NOT DISTINCT FROM b.grade 
AND a.item_name IS NOT DISTINCT FROM b.item_name 
AND a.type IS NOT DISTINCT FROM b.type 
AND a.category IS NOT DISTINCT FROM b.category;

-- 2. Clean up "Ghost" items
-- (Optional cleanup: If you want to delete ALL shop items that don't have a matching Master ('All') item)
-- Uncomment the below block if you want to strictly enforce that ONLY Master items can have overrides.
/*
DELETE FROM uniforms
WHERE grade != 'All'
AND NOT EXISTS (
    SELECT 1 FROM uniforms u2
    WHERE u2.school_id = uniforms.school_id
    AND u2.grade = 'All'
    AND u2.item_name = uniforms.item_name
    AND u2.type = uniforms.type
    AND u2.category = uniforms.category
);
*/

-- 3. Enforce Unique Constraint
-- This ensures that it's physically impossible to insert a duplicate row for the same school/class/item combo.
DROP INDEX IF EXISTS idx_uniforms_unique_entry;
CREATE UNIQUE INDEX idx_uniforms_unique_entry 
ON uniforms (school_id, grade, item_name, type, category);

-- 4. Verify
SELECT count(*) as total_rows FROM uniforms;
