-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- Create permissive policies for public order creation
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can create order items" 
ON public.order_items 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);