-- Create a function to deduct stock when orders are placed
CREATE OR REPLACE FUNCTION public.deduct_stock(p_product_id uuid, p_size text, p_quantity integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE product_sizes
  SET stock = stock - p_quantity
  WHERE product_id = p_product_id 
    AND size = p_size
    AND stock >= p_quantity;
END;
$$;