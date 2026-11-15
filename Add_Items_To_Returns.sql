-- Add items column to return_requests to support partial returns
ALTER TABLE public.return_requests 
ADD COLUMN IF NOT EXISTS returned_items JSONB;

-- Comment for documentation
COMMENT ON COLUMN public.return_requests.returned_items IS 'Stores array of {order_item_id, quantity} for partial returns';
