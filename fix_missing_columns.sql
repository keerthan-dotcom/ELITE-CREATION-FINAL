-- =================================================================
-- FIX MISSING COLUMNS & PERMISSIONS
-- Run this to fix "Activating/Deactivating" and "Price Change" errors
-- =================================================================

-- 1. Grant usage to anon and authenticated roles (Permissions Foundation)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 2. Add 'status' column to 'classes' table if missing
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.classes ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column status already exists in classes';
    END;
END $$;

-- 3. Add 'status' column to 'uniforms' table if missing (Consistency)
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.uniforms ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column status already exists in uniforms';
    END;
END $$;

-- 4. Reset RLS Policies to be ultra-permissive for the Admin Panel
-- SCHOOLS
DROP POLICY IF EXISTS "Enable insert for all users" ON public.schools;
DROP POLICY IF EXISTS "Public read schools" ON public.schools;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.schools;
CREATE POLICY "Enable all access for all users" ON public.schools FOR ALL USING (true) WITH CHECK (true);

-- CLASSES
DROP POLICY IF EXISTS "Enable insert for all users" ON public.classes;
DROP POLICY IF EXISTS "Public read classes" ON public.classes;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.classes;
CREATE POLICY "Enable all access for all users" ON public.classes FOR ALL USING (true) WITH CHECK (true);

-- UNIFORMS
DROP POLICY IF EXISTS "Enable insert for all users" ON public.uniforms;
DROP POLICY IF EXISTS "Public read uniforms" ON public.uniforms;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.uniforms;
CREATE POLICY "Enable all access for all users" ON public.uniforms FOR ALL USING (true) WITH CHECK (true);

-- PRODUCT SIZES
DROP POLICY IF EXISTS "Enable insert for all users" ON public.product_sizes;
DROP POLICY IF EXISTS "Public read product_sizes" ON public.product_sizes;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.product_sizes;
CREATE POLICY "Enable all access for all users" ON public.product_sizes FOR ALL USING (true) WITH CHECK (true);

-- ORDERS & RECEIPTS
DROP POLICY IF EXISTS "Enable insert for orders" ON public.orders;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.orders;
CREATE POLICY "Enable all access for all users" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable insert for order_items" ON public.order_items;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.order_items;
CREATE POLICY "Enable all access for all users" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable insert for receipts" ON public.receipts;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.receipts;
CREATE POLICY "Enable all access for all users" ON public.receipts FOR ALL USING (true) WITH CHECK (true);
