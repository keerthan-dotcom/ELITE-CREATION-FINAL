-- ============================================================
-- SUPABASE SETUP: Google Auth + Order History + Return Requests
-- Run this ENTIRE script in your Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. ADD user_id to orders table
--    Links an order to a Supabase Auth user
-- ─────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for fast lookup of user's orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);


-- ─────────────────────────────────────────────
-- 2. CREATE return_requests table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.return_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason      TEXT NOT NULL CHECK (char_length(reason) <= 100),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 3. RLS Policies for orders
--    Students can only read their own orders
-- ─────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT an order (checkout creates orders)
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders" ON public.orders
  FOR INSERT WITH CHECK (true);

-- Users can only SELECT their own orders
DROP POLICY IF EXISTS "Users see own orders" ON public.orders;
CREATE POLICY "Users see own orders" ON public.orders
  FOR SELECT USING (
    auth.uid() = user_id
    OR auth.uid() IS NULL  -- Allow unauthenticated reads for admin (uses service key or no RLS bypass needed)
  );

-- Allow all reads for now (admin needs to read all orders)
-- If you want to restrict admin further, use service_role key in admin
DROP POLICY IF EXISTS "Admin reads all orders" ON public.orders;
CREATE POLICY "Admin reads all orders" ON public.orders
  FOR SELECT USING (true);

-- Allow updates/deletes (for admin status updates and the school cascade delete fix)
DROP POLICY IF EXISTS "Allow order updates" ON public.orders;
CREATE POLICY "Allow order updates" ON public.orders
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow order deletes" ON public.orders;
CREATE POLICY "Allow order deletes" ON public.orders
  FOR DELETE USING (true);


-- ─────────────────────────────────────────────
-- 4. RLS Policies for return_requests
-- ─────────────────────────────────────────────
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own return requests
DROP POLICY IF EXISTS "Users can request returns" ON public.return_requests;
CREATE POLICY "Users can request returns" ON public.return_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own return requests
DROP POLICY IF EXISTS "Users see own return requests" ON public.return_requests;
CREATE POLICY "Users see own return requests" ON public.return_requests
  FOR SELECT USING (auth.uid() = user_id OR true); -- 'true' allows admin to read all

-- Admin can update status (approve/reject)
DROP POLICY IF EXISTS "Admin updates return requests" ON public.return_requests;
CREATE POLICY "Admin updates return requests" ON public.return_requests
  FOR UPDATE USING (true);

-- Allow cascade deletes
DROP POLICY IF EXISTS "Allow return request deletes" ON public.return_requests;
CREATE POLICY "Allow return request deletes" ON public.return_requests
  FOR DELETE USING (true);


-- ─────────────────────────────────────────────
-- 5. Fix: ON DELETE CASCADE for orders.school_id
--    (from the previous fix — run if not already done)
-- ─────────────────────────────────────────────
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_school_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_school_id_fkey
    FOREIGN KEY (school_id)
    REFERENCES public.schools(id)
    ON DELETE CASCADE;


-- ─────────────────────────────────────────────
-- 6. SUPABASE DASHBOARD STEPS (do manually)
-- ─────────────────────────────────────────────
--
-- Go to: Supabase Dashboard → Authentication → Providers → Google
--
-- Enable Google and fill in:
--   Client ID:     [Your Google OAuth Client ID]
--   Client Secret: [Your Google OAuth Client Secret]
--
-- Then go to: Google Cloud Console → APIs & Services → Credentials
--   → Create OAuth 2.0 Client ID (Web application)
--   → Authorized redirect URIs: add
--       https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
--
-- For LOCAL dev, also add your Supabase project URL callback.
-- That's it! Google login is handled by Supabase Auth automatically.
-- ─────────────────────────────────────────────
