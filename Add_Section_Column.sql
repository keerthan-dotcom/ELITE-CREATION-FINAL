-- Add section column to orders table (run in Supabase SQL Editor)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS section TEXT DEFAULT NULL;
