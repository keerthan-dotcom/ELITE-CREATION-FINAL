-- Enable RLS policies for Admin actions (Insert/Update/Delete)
-- Since auth is currently client-side PIN based, we must allow 'anon' role to perform these actions

-- Schools
DROP POLICY IF EXISTS "Enable insert for all users" ON public.schools;
CREATE POLICY "Enable insert for all users" ON public.schools FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON public.schools;
CREATE POLICY "Enable update for all users" ON public.schools FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON public.schools;
CREATE POLICY "Enable delete for all users" ON public.schools FOR DELETE USING (true);

-- Classes
DROP POLICY IF EXISTS "Enable insert for all users" ON public.classes;
CREATE POLICY "Enable insert for all users" ON public.classes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON public.classes;
CREATE POLICY "Enable update for all users" ON public.classes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON public.classes;
CREATE POLICY "Enable delete for all users" ON public.classes FOR DELETE USING (true);

-- Uniforms
DROP POLICY IF EXISTS "Enable insert for all users" ON public.uniforms;
CREATE POLICY "Enable insert for all users" ON public.uniforms FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON public.uniforms;
CREATE POLICY "Enable update for all users" ON public.uniforms FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON public.uniforms;
CREATE POLICY "Enable delete for all users" ON public.uniforms FOR DELETE USING (true);

-- Product Sizes
DROP POLICY IF EXISTS "Enable insert for all users" ON public.product_sizes;
CREATE POLICY "Enable insert for all users" ON public.product_sizes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON public.product_sizes;
CREATE POLICY "Enable delete for all users" ON public.product_sizes FOR DELETE USING (true);

-- Orders
DROP POLICY IF EXISTS "Enable insert for orders" ON public.orders;
CREATE POLICY "Enable insert for orders" ON public.orders FOR INSERT WITH CHECK (true);

-- Order Items
DROP POLICY IF EXISTS "Enable insert for order_items" ON public.order_items;
CREATE POLICY "Enable insert for order_items" ON public.order_items FOR INSERT WITH CHECK (true);

-- Receipts
DROP POLICY IF EXISTS "Enable insert for receipts" ON public.receipts;
CREATE POLICY "Enable insert for receipts" ON public.receipts FOR INSERT WITH CHECK (true);

-- NOTE: The column rename is REMOVED because the column is already named 'grade'
