-- Add stock column to uniforms table
-- Stores inventory count per size variant
-- Example: { "S": 10, "M": 5, "W32 L30": 8 }

ALTER TABLE uniforms ADD COLUMN IF NOT EXISTS stock JSONB DEFAULT '{}';

-- Function to safely decrement stock
-- Returns true if successful, false if insufficient stock
CREATE OR REPLACE FUNCTION decrement_stock(
  p_uniform_id UUID, 
  p_size TEXT, 
  p_quantity INT
) RETURNS BOOLEAN AS $$
DECLARE
  current_stock INT;
  new_stock INT;
  stock_data JSONB;
BEGIN
  -- Lock the row for update
  SELECT stock INTO stock_data FROM uniforms WHERE id = p_uniform_id FOR UPDATE;
  
  -- Get current stock for the specific size
  -- If size not found in JSON, assume 0 or handle logic. 
  -- For now, purely rely on the JSON key.
  -- Use 0 if null.
  current_stock := COALESCE((stock_data->>p_size)::INT, 0);
  
  IF current_stock < p_quantity THEN
    RETURN FALSE; -- Insufficient stock
  END IF;
  
  new_stock := current_stock - p_quantity;
  
  -- Update the JSONB column
  UPDATE uniforms 
  SET stock = jsonb_set(stock, array[p_size], to_jsonb(new_stock))
  WHERE id = p_uniform_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
