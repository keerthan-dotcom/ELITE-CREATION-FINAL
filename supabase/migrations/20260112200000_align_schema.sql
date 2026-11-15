-- Align orders table to contract
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') AND
     NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'uniforms') THEN
    ALTER TABLE products RENAME TO uniforms;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_number') AND
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_code') THEN
    ALTER TABLE orders RENAME COLUMN order_number TO order_code;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'class') AND
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'grade') THEN
    ALTER TABLE orders RENAME COLUMN class TO grade;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'phone_number') AND
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'phone') THEN
    ALTER TABLE orders RENAME COLUMN phone_number TO phone;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_mode') AND
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
    ALTER TABLE orders RENAME COLUMN payment_mode TO payment_method;
  END IF;
END $$;

-- Align order_items table to contract
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'product_id') AND
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'uniform_id') THEN
    ALTER TABLE order_items RENAME COLUMN product_id TO uniform_id;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'uniform_id') THEN
    ALTER TABLE order_items ADD COLUMN uniform_id UUID REFERENCES uniforms(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'unit_price') AND
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'price') THEN
    ALTER TABLE order_items RENAME COLUMN unit_price TO price;
  END IF;
END $$;

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_name TEXT;

-- Drop foreign key if it exists on product_id and recreate on uniform_id if needed, 
-- but usually rename preserves constraints. 
-- However, we strictly want uniform_id to point to uniforms.id.
-- Check if constraint exists, if not add it.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_uniform_id_fkey') THEN
        ALTER TABLE order_items ADD CONSTRAINT order_items_uniform_id_fkey FOREIGN KEY (uniform_id) REFERENCES uniforms(id);
    END IF;
END $$;
