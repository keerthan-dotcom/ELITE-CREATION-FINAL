-- Add status and school_code to schools table
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
ADD COLUMN IF NOT EXISTS school_code TEXT UNIQUE;

-- Handle table rename if it exists AND classes does not exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'school_classes') THEN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'classes') THEN
        ALTER TABLE school_classes RENAME TO classes;
    END IF;
  END IF;
END $$;

-- Create classes table (if it wasn't renamed or created yet)
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------
-- FIX EXISTING SCHEMA
-- -----------------------------------------------------------------------
DO $$
BEGIN
    -- Rename grade_name to class_name if needed
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'grade_name') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'class_name') THEN
            ALTER TABLE classes RENAME COLUMN grade_name TO class_name;
        END IF;
    END IF;
END $$;

-- Safely add columns to classes
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS class_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- --------------------------------------------------------
-- DEDUPLICATE UNIFORMS BEFORE INDEXING
-- --------------------------------------------------------
-- This removes older duplicates based on logic, keeping one unique entry per key combo
DELETE FROM uniforms a 
USING uniforms b 
WHERE a.id < b.id 
AND a.school_id = b.school_id 
AND a.grade IS NOT DISTINCT FROM b.grade 
AND a.item_name IS NOT DISTINCT FROM b.item_name 
AND a.type IS NOT DISTINCT FROM b.type 
AND a.category IS NOT DISTINCT FROM b.category;

-- --------------------------------------------------------
-- ADD UNIQUE INDEX FOR UPSERT SUPPORT
-- --------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_uniforms_unique_entry 
ON uniforms (school_id, grade, item_name, type, category);

-- --------------------------------------------------------
-- RLS POLICIES
-- --------------------------------------------------------
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE uniforms ENABLE ROW LEVEL SECURITY;

-- Re-create permissive policies
DROP POLICY IF EXISTS "Enable read access for all users" ON schools;
DROP POLICY IF EXISTS "Enable insert for all users" ON schools;
DROP POLICY IF EXISTS "Enable update for all users" ON schools;
DROP POLICY IF EXISTS "Enable delete for all users" ON schools;
CREATE POLICY "Enable read access for all users" ON schools FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON schools FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON schools FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON schools FOR DELETE USING (true);

-- Classes Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON classes;
DROP POLICY IF EXISTS "Enable insert for all users" ON classes;
DROP POLICY IF EXISTS "Enable update for all users" ON classes;
DROP POLICY IF EXISTS "Enable delete for all users" ON classes;
CREATE POLICY "Enable read access for all users" ON classes FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON classes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON classes FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON classes FOR DELETE USING (true);

-- Uniforms Policies
DROP POLICY IF EXISTS "Enable read access for all users" ON uniforms;
DROP POLICY IF EXISTS "Enable insert for all users" ON uniforms;
DROP POLICY IF EXISTS "Enable update for all users" ON uniforms;
DROP POLICY IF EXISTS "Enable delete for all users" ON uniforms;
CREATE POLICY "Enable read access for all users" ON uniforms FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON uniforms FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON uniforms FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON uniforms FOR DELETE USING (true);
