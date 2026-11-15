-- Add fulfillment_status column to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'pending_pickup';

-- Allow anyone to update product_sizes stock (for order stock deduction)
CREATE POLICY "Anyone can update product sizes stock" 
ON product_sizes 
FOR UPDATE 
TO anon, authenticated
WITH CHECK (true);

-- Enable RLS updates using expression
DROP POLICY IF EXISTS "Anyone can update product sizes stock" ON product_sizes;

CREATE POLICY "Anyone can update product sizes stock" 
ON product_sizes 
FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);