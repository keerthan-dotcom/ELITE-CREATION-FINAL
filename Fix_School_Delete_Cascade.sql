-- ============================================================
-- FIX: Add ON DELETE CASCADE to orders and order_items tables
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Fix 1: orders.school_id → should cascade when school is deleted
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_school_id_fkey,
  ADD CONSTRAINT orders_school_id_fkey
    FOREIGN KEY (school_id)
    REFERENCES public.schools(id)
    ON DELETE CASCADE;

-- Fix 2: order_items.uniform_id → set NULL when a uniform is deleted
--        (we don't want to lose order history just because a uniform was removed)
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_uniform_id_fkey,
  ADD CONSTRAINT order_items_uniform_id_fkey
    FOREIGN KEY (uniform_id)
    REFERENCES public.uniforms(id)
    ON DELETE SET NULL;

-- Fix 3: Also allow deleting schools that have RLS write policies
-- In case admin delete is blocked by RLS, add a delete policy:
DROP POLICY IF EXISTS "Public delete schools" ON public.schools;
CREATE POLICY "Public delete schools" ON public.schools FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public delete orders" ON public.orders;
CREATE POLICY "Public delete orders" ON public.orders FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public delete order_items" ON public.order_items;
CREATE POLICY "Public delete order_items" ON public.order_items FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public delete uniforms" ON public.uniforms;
CREATE POLICY "Public delete uniforms" ON public.uniforms FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public delete classes" ON public.classes;
CREATE POLICY "Public delete classes" ON public.classes FOR DELETE USING (true);
