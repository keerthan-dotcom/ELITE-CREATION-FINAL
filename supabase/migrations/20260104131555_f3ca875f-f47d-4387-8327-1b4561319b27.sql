-- Drop the restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON order_items;

-- Create permissive policy for orders (allows anonymous order creation)
CREATE POLICY "Anyone can create orders" 
ON orders 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Create permissive policy for order items (allows anonymous order item creation)
CREATE POLICY "Anyone can create order items" 
ON order_items 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);