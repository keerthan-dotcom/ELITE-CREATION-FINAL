-- Ensure all orders have school_name populated from schools table
UPDATE public.orders o
SET school_name = s.name
FROM public.schools s
WHERE o.school_id = s.id 
  AND (o.school_name IS NULL OR o.school_name = '' OR o.school_name = 'Unknown');

-- Add fulfillment_status if missing
UPDATE public.orders
SET fulfillment_status = 'pending_pickup'
WHERE fulfillment_status IS NULL 
  OR fulfillment_status = '';
