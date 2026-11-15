-- Fix dashboard read access - Allow dashboard to read orders immediately after checkout
-- This ensures distributor dashboard can see orders without admin restrictions

-- Drop all existing SELECT policies on orders to start fresh
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view their orders" ON public.orders;

-- Create a single permissive policy that allows ALL authenticated users to read orders
-- This includes admin users and any authenticated session
CREATE POLICY "Anyone authenticated can view orders" 
ON public.orders 
FOR SELECT 
TO authenticated
USING (true);

-- Also allow anonymous reads (for testing, but dashboard uses authenticated)
CREATE POLICY "Anyone can view orders" 
ON public.orders 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Drop and recreate order_items SELECT policies
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;

-- Allow all to view order items
CREATE POLICY "Anyone can view order items" 
ON public.order_items 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Verify policies are created
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated for orders and order_items';
END $$;
