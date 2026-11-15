-- Create function to validate order item prices match current product prices
CREATE OR REPLACE FUNCTION public.validate_order_item_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_price NUMERIC;
BEGIN
  -- Fetch current product price from database
  SELECT price INTO current_price
  FROM products
  WHERE id = NEW.product_id;
  
  -- Verify product exists
  IF current_price IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', NEW.product_id
      USING ERRCODE = '23503'; -- Foreign key violation
  END IF;
  
  -- Verify unit_price matches actual product price
  IF NEW.unit_price != current_price THEN
    RAISE EXCEPTION 'Price validation failed: expected %, received %', current_price, NEW.unit_price
      USING ERRCODE = '23514'; -- Check constraint violation
  END IF;
  
  -- Ensure quantity is valid
  IF NEW.quantity <= 0 OR NEW.quantity > 100 THEN
    RAISE EXCEPTION 'Invalid quantity: must be between 1 and 100'
      USING ERRCODE = '23514';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate prices before insert
CREATE TRIGGER validate_order_item_price_trigger
  BEFORE INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_item_price();

-- Create function to validate order total matches sum of items
CREATE OR REPLACE FUNCTION public.validate_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calculated_total NUMERIC;
  order_total NUMERIC;
BEGIN
  -- Calculate expected total from order items
  SELECT SUM(unit_price * quantity) INTO calculated_total
  FROM order_items
  WHERE order_id = NEW.order_id;
  
  -- Get the order's total_amount
  SELECT total_amount INTO order_total
  FROM orders
  WHERE id = NEW.order_id;
  
  -- Verify totals match (allow small rounding differences)
  IF ABS(order_total - calculated_total) > 0.01 THEN
    RAISE EXCEPTION 'Order total mismatch: order says %, items sum to %', order_total, calculated_total
      USING ERRCODE = '23514';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate order total after all items are inserted
CREATE TRIGGER validate_order_total_trigger
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_total();