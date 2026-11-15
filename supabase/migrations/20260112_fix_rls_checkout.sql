-- ==========================================
-- FIX RLS POLICIES FOR CHECKOUT & DASHBOARD
-- ==========================================

-- 1. Fix RLS for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert" ON orders;
DROP POLICY IF EXISTS "Public insert orders" ON orders;
DROP POLICY IF EXISTS "Public read orders" ON orders;

-- Allow public (anon) to insert orders
CREATE POLICY "Public insert orders"
ON orders
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow public (anon) to read orders (for dashboard/order confirmation lookups)
-- Note: In a real prod app you might restrict this, but request requires "Public read" equivalent
CREATE POLICY "Public read orders"
ON orders
FOR SELECT
TO anon
USING (true);

-- 2. Fix RLS for order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert items" ON order_items;
DROP POLICY IF EXISTS "Public insert order items" ON order_items;
DROP POLICY IF EXISTS "Public read order items" ON order_items;

-- Allow public insert
CREATE POLICY "Public insert order items"
ON order_items
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow public read
CREATE POLICY "Public read order items"
ON order_items
FOR SELECT
TO anon
USING (true);

-- 3. Fix inventory updates
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public update stock" ON product_sizes;

-- Allow public to update stock
CREATE POLICY "Public update stock"
ON product_sizes
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- 4. Notify schema reload
NOTIFY pgrst, 'reload schema';
