-- Add color column to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT NULL;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
