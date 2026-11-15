-- Add UPDATE and DELETE RLS policies for orders, order_items, and admin_users

-- Orders: Only admins can update/delete
CREATE POLICY "Admins can update orders" ON orders
FOR UPDATE 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete orders" ON orders
FOR DELETE 
USING (is_admin(auth.uid()));

-- Order items: Immutable for audit trail
CREATE POLICY "Order items are immutable" ON order_items
FOR UPDATE 
USING (false);

CREATE POLICY "Order items cannot be deleted" ON order_items
FOR DELETE 
USING (false);

-- Admin users: Only admins can manage
CREATE POLICY "Admins can insert admin users" ON admin_users
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update admin users" ON admin_users
FOR UPDATE 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete admin users" ON admin_users
FOR DELETE 
USING (is_admin(auth.uid()));

-- Add server-side validation constraints for orders table
ALTER TABLE orders ADD CONSTRAINT valid_phone_number 
  CHECK (phone_number ~ '^[6-9][0-9]{9}$');

ALTER TABLE orders ADD CONSTRAINT valid_student_name 
  CHECK (LENGTH(student_name) BETWEEN 2 AND 100);

ALTER TABLE orders ADD CONSTRAINT valid_class 
  CHECK (LENGTH(class) BETWEEN 1 AND 50);

ALTER TABLE orders ADD CONSTRAINT valid_total_amount 
  CHECK (total_amount >= 0 AND total_amount <= 1000000);

-- Create verify_admin_access function for server-side admin verification
CREATE OR REPLACE FUNCTION public.verify_admin_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_admin(auth.uid())
$$;