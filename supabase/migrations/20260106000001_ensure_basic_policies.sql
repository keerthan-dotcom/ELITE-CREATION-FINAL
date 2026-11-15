-- Ensure basic RLS policies exist for order persistence
-- This migration ensures orders can be inserted and read even if other migrations haven't run

-- Ensure orders can be inserted by anyone
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders' 
    AND policyname = 'Anyone can create orders'
  ) THEN
    CREATE POLICY "Anyone can create orders" 
    ON public.orders 
    FOR INSERT 
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- Ensure orders can be viewed (for dashboard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'orders' 
    AND policyname = 'Anyone can view orders'
  ) THEN
    CREATE POLICY "Anyone can view orders" 
    ON public.orders 
    FOR SELECT 
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

-- Ensure order_items can be inserted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'order_items' 
    AND policyname = 'Anyone can create order items'
  ) THEN
    CREATE POLICY "Anyone can create order items" 
    ON public.order_items 
    FOR INSERT 
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- Ensure order_items can be viewed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'order_items' 
    AND policyname = 'Anyone can view order items'
  ) THEN
    CREATE POLICY "Anyone can view order items" 
    ON public.order_items 
    FOR SELECT 
    TO anon, authenticated
    USING (true);
  END IF;
END $$;

-- Ensure product_sizes can be updated (for inventory)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'product_sizes' 
    AND policyname = 'Anyone can update product sizes stock'
  ) THEN
    CREATE POLICY "Anyone can update product sizes stock" 
    ON public.product_sizes 
    FOR UPDATE 
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Ensure RLS enabled for main tables (safe to run multiple times)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
    EXECUTE 'ALTER TABLE public.products ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
    EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
    EXECUTE 'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_items') THEN
    EXECUTE 'ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='product_sizes') THEN
    EXECUTE 'ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Allow anyone to view products (catalog)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND policyname = 'Anyone can view products'
  ) THEN
    CREATE POLICY "Anyone can view products"
      ON public.products
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Allow anyone to view profiles (public profile fields)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Anyone can view profiles'
  ) THEN
    CREATE POLICY "Anyone can view profiles"
      ON public.profiles
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
