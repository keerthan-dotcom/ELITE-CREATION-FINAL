-- ==========================================
-- ELITE CREATIONS DATABASE SETUP
-- ==========================================
-- This script sets up the entire database schema from scratch.
-- It combines Schools, Classes, Uniforms, Product Sizes, Orders, Order Items, and Receipts.
-- Run this in your new database SQL Editor.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLES
-- ==========================================

-- 1.1 Schools Table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Bangalore',
    logo_url TEXT,
    school_code TEXT UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.2 Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    grade_name TEXT NOT NULL, -- LKG, UKG, 1st..12th
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.3 Uniforms Table (formerly Products)
CREATE TABLE IF NOT EXISTS public.uniforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    grade TEXT NOT NULL, -- Target Grade or 'All'
    item_name TEXT NOT NULL, -- Shirt, Pant, Skirt, Tie, Blazer
    price NUMERIC NOT NULL,
    image_url TEXT,
    type TEXT, -- 'Boys', 'Girls', 'Unisex'
    category TEXT, -- 'Summer', 'Winter', 'Regular'
    description TEXT,
    fabric_info TEXT,
    fit_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.4 Product Sizes (Inventory - Updated to reference Uniforms)
CREATE TABLE IF NOT EXISTS public.product_sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uniform_id UUID REFERENCES public.uniforms(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(uniform_id, size)
);

-- 1.5 Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code TEXT UNIQUE NOT NULL, -- ORD-XXXXXX
    student_name TEXT NOT NULL,
    school_id UUID REFERENCES public.schools(id),
    school_name TEXT, 
    grade TEXT NOT NULL,
    phone TEXT NOT NULL,
    total_amount NUMERIC NOT NULL,
    payment_method TEXT DEFAULT 'UPI', -- UPI, Cash, Card, PAY_AT_SCHOOL, UPI_PENDING
    status TEXT DEFAULT 'Pending', -- Pending, Packed, Delivered, Confirmed
    fulfillment_status TEXT DEFAULT 'pending_pickup',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.6 Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    uniform_id UUID REFERENCES public.uniforms(id),
    item_name TEXT, 
    size TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.7 Receipts Table (For generated receipts)
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL UNIQUE,
    student_name TEXT NOT NULL,
    school_name TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. SECURITY POLICIES (RLS)
-- ==========================================

-- Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uniforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Schools: Public Read
DROP POLICY IF EXISTS "Public read schools" ON public.schools;
CREATE POLICY "Public read schools" ON public.schools FOR SELECT USING (true);

-- Classes: Public Read
DROP POLICY IF EXISTS "Public read classes" ON public.classes;
CREATE POLICY "Public read classes" ON public.classes FOR SELECT USING (true);

-- Uniforms: Public Read
DROP POLICY IF EXISTS "Public read uniforms" ON public.uniforms;
CREATE POLICY "Public read uniforms" ON public.uniforms FOR SELECT USING (true);

-- Product Sizes: Public Read, Update (for inventory deduction)
DROP POLICY IF EXISTS "Public read product_sizes" ON public.product_sizes;
CREATE POLICY "Public read product_sizes" ON public.product_sizes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public update product_sizes" ON public.product_sizes;
CREATE POLICY "Public update product_sizes" ON public.product_sizes FOR UPDATE USING (true) WITH CHECK (true);

-- Orders: Public Create, Read, Update
DROP POLICY IF EXISTS "Public create orders" ON public.orders;
CREATE POLICY "Public create orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read orders" ON public.orders;
CREATE POLICY "Public read orders" ON public.orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public update orders" ON public.orders;
CREATE POLICY "Public update orders" ON public.orders FOR UPDATE USING (true);

-- Order Items: Public Create, Read
DROP POLICY IF EXISTS "Public create order_items" ON public.order_items;
CREATE POLICY "Public create order_items" ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read order_items" ON public.order_items;
CREATE POLICY "Public read order_items" ON public.order_items FOR SELECT USING (true);

-- Receipts: Public Create, Read
DROP POLICY IF EXISTS "Public create receipts" ON public.receipts;
CREATE POLICY "Public create receipts" ON public.receipts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read receipts" ON public.receipts;
CREATE POLICY "Public read receipts" ON public.receipts FOR SELECT USING (true);


-- ==========================================
-- 3. FUNCTIONS & TRIGGERS
-- ==========================================

-- 3.1 Generate Order Code Trigger
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_code IS NULL THEN
      NEW.order_code := 'ORD-' || substring(md5(random()::text) from 1 for 6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_code ON public.orders;
CREATE TRIGGER set_order_code
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_code();

-- 3.2 Validate Order Item Price
CREATE OR REPLACE FUNCTION public.validate_order_item_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_price NUMERIC;
BEGIN
  -- Fetch current uniform price
  SELECT price INTO current_price
  FROM uniforms
  WHERE id = NEW.uniform_id;
  
  -- Verify uniform exists
  IF current_price IS NULL THEN
    RAISE EXCEPTION 'Uniform not found: %', NEW.uniform_id USING ERRCODE = '23503';
  END IF;

  -- Ensure quantity is valid
  IF NEW.quantity <= 0 OR NEW.quantity > 100 THEN
    RAISE EXCEPTION 'Invalid quantity: must be between 1 and 100' USING ERRCODE = '23514';
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_order_item_price_trigger ON public.order_items;
CREATE TRIGGER validate_order_item_price_trigger
  BEFORE INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_item_price();

-- 3.3 Validate Order Total
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
  -- Calculate expected total
  SELECT SUM(price * quantity) INTO calculated_total
  FROM order_items
  WHERE order_id = NEW.order_id;
  
  -- Get the order's total_amount
  SELECT total_amount INTO order_total
  FROM orders
  WHERE id = NEW.order_id;
  
  -- Verify totals match (warn only)
  IF calculated_total IS NOT NULL AND ABS(order_total - calculated_total) > 1.00 THEN
    RAISE WARNING 'Order total mismatch: order says %, items sum to %', order_total, calculated_total;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_order_total_trigger ON public.order_items;
CREATE TRIGGER validate_order_total_trigger
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_order_total();

-- 3.4 Generate Receipt Number
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  receipt_num TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate receipt number: RC + timestamp + random 4 chars
    receipt_num := 'RC' || TO_CHAR(EXTRACT(EPOCH FROM NOW())::BIGINT, 'FM9999999999') || 
                   SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    
    -- Check if it exists
    SELECT EXISTS(SELECT 1 FROM public.receipts WHERE receipt_number = receipt_num) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN UPPER(receipt_num);
    END IF;
  END LOOP;
END;
$$;

-- 3.5 Create Order with Receipt (Frontend RPC Call)
CREATE OR REPLACE FUNCTION public.create_order_with_receipt(
  p_order_number TEXT,
  p_school_id UUID,
  p_school_name TEXT,
  p_student_name TEXT,
  p_class TEXT,
  p_phone_number TEXT,
  p_payment_mode TEXT,
  p_total_amount DECIMAL,
  p_order_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_receipt_number TEXT;
  v_receipt_id UUID;
  v_item JSONB;
  v_product_id UUID; -- This is actually uniform_id
  v_size TEXT;
  v_quantity INTEGER;
  v_unit_price DECIMAL;
  v_error TEXT;
BEGIN
  -- Insert order
  INSERT INTO public.orders (
    order_code,
    school_id,
    school_name,
    student_name,
    grade,
    phone,
    payment_method, -- Maps p_payment_mode (likely 'UPI_PENDING') to payment_method
    total_amount,
    status,
    fulfillment_status
  ) VALUES (
    p_order_number,
    p_school_id,
    p_school_name,
    p_student_name,
    p_class,
    p_phone_number,
    p_payment_mode,
    p_total_amount,
    'confirmed',
    'pending_pickup'
  )
  RETURNING id INTO v_order_id;
  
  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_size := v_item->>'size';
    v_quantity := (v_item->>'quantity')::INTEGER;
    v_unit_price := (v_item->>'unit_price')::DECIMAL;
    
    INSERT INTO public.order_items (
      order_id,
      uniform_id, -- Maps product_id to uniform_id
      size,
      quantity,
      price
    ) VALUES (
      v_order_id,
      v_product_id,
      v_size,
      v_quantity,
      v_unit_price
    );
    
    -- Update inventory (deduct stock)
    -- Using product_sizes table, referencing uniform_id
    UPDATE public.product_sizes
    SET stock = stock - v_quantity
    WHERE uniform_id = v_product_id
      AND size = v_size
      AND stock >= v_quantity;
    
    -- If stock update affected 0 rows, log warning but continue
    IF NOT FOUND THEN
      RAISE WARNING 'Insufficient stock for uniform % size %, but order proceeding', v_product_id, v_size;
    END IF;
  END LOOP;
  
  -- Generate and insert receipt
  v_receipt_number := public.generate_receipt_number();
  
  INSERT INTO public.receipts (
    order_id,
    receipt_number,
    student_name,
    school_name,
    total_amount,
    payment_method
  ) VALUES (
    v_order_id,
    v_receipt_number,
    p_student_name,
    p_school_name,
    p_total_amount,
    p_payment_mode
  )
  RETURNING id INTO v_receipt_id;
  
  -- Success - return order and receipt info
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', p_order_number,
    'receipt_number', v_receipt_number,
    'receipt_id', v_receipt_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    v_error := SQLERRM;
    RAISE WARNING 'Order creation failed: %', v_error;
    -- Return error info
    RETURN jsonb_build_object(
      'success', false,
      'error', v_error
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_with_receipt TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_receipt_number TO anon, authenticated;


-- ==========================================
-- 4. SEED DATA
-- ==========================================

-- 4.1 Seed Schools
INSERT INTO public.schools (name, area, city, logo_url) VALUES
('DPS Whitefield', 'Whitefield', 'Bangalore', 'https://upload.wikimedia.org/wikipedia/en/9/9b/Delhi_Public_School_Society_Logo.svg'),
('NPS Indiranagar', 'Indiranagar', 'Bangalore', 'https://nps.ac.in/logos/nps-logo.png'),
('Vibgyor Marathahalli', 'Marathahalli', 'Bangalore', 'https://www.vibgyorhigh.com/images/logo.png'),
('Ryan International', 'Whitefield', 'Bangalore', 'https://www.ryaninternational.org/assets/images/logo.png'),
('Presidency School', 'Kasturi Nagar', 'Bangalore', 'https://presidencyschoolsouth.org/wp-content/uploads/2019/07/Presidency-High-School-Logo.png'),
('Jain Public School', 'Jakkur', 'Bangalore', 'https://www.jainpublicschool.com/wp-content/uploads/2019/08/logo.png'),
('Greenwood High', 'Sarjapur', 'Bangalore', 'https://greenwoodhigh.edu.in/wp-content/uploads/2021/01/logo.png'),
('Inventure Academy', 'Whitefield', 'Bangalore', 'https://www.inventureacademy.com/wp-content/themes/inventure/images/logo.png'),
('The International School Bangalore', 'Whitefield', 'Bangalore', 'https://tisb.org/images/logo.png'),
('Indus International School', 'Sarjapur', 'Bangalore', 'https://indusschool.com/bangalore/wp-content/uploads/2020/06/logo-1.png'),
('Canadian International School', 'Yelahanka', 'Bangalore', 'https://www.canadianinternationalschool.com/wp-content/uploads/2019/01/cis-logo.png'),
('Stonehill International School', 'Jalahalli', 'Bangalore', 'https://www.stonehill.in/wp-content/uploads/2019/09/logo-1.png'),
('Ebenezer International School', 'Electronic City', 'Bangalore', 'https://www.eis.edu.in/wp-content/uploads/2019/07/logo.png'),
('Treamis World School', 'Electronic City', 'Bangalore', 'https://www.treamis.org/wp-content/uploads/2019/07/logo.png'),
('Primus Public School', 'Sarjapur', 'Bangalore', 'https://primusschool.edu.in/wp-content/uploads/2019/07/logo.png'),
('Harvest International School', 'Sarjapur', 'Bangalore', 'https://www.harvestinternationalschool.org/wp-content/uploads/2019/07/logo.png'),
('Delhi Public School', 'East', 'Bangalore', 'https://www.dpsblr.com/wp-content/uploads/2019/07/logo.png'),
('National Public School', 'Koramangala', 'Bangalore', 'https://npskrm.com/wp-content/uploads/2019/07/logo.png'),
('Bethany High', 'Koramangala', 'Bangalore', 'https://bethanyhigh.edu.in/wp-content/uploads/2019/07/logo.png'),
('Bishop Cotton Boys School', 'Residency Road', 'Bangalore', 'https://cottonboys.com/wp-content/uploads/2019/07/logo.png'),
('Bishop Cotton Girls School', 'St. Marks Road', 'Bangalore', 'https://cottonboys.com/wp-content/uploads/2019/07/logo.png'),
('St. Josephs Boys High School', 'Museum Road', 'Bangalore', 'https://sjbhs.edu.in/wp-content/uploads/2019/07/logo.png'),
('Baldwin Boys High School', 'Richmond Town', 'Bangalore', 'https://baldwinboys.edu.in/wp-content/uploads/2019/07/logo.png'),
('Sophia High School', 'Palace Road', 'Bangalore', 'https://sophiahighschool.org/wp-content/uploads/2019/07/logo.png'),
('Mount Carmel College', 'Palace Road', 'Bangalore', 'https://mccblr.edu.in/wp-content/uploads/2019/07/logo.png');

-- 4.2 Seed Classes (LKG-12th for all schools)
DO $$
DECLARE
    school_rec RECORD;
    grades TEXT[] := ARRAY['LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
    g TEXT;
BEGIN
    FOR school_rec IN SELECT id FROM public.schools LOOP
        FOREACH g IN ARRAY grades LOOP
            INSERT INTO public.classes (school_id, grade_name) VALUES (school_rec.id, g);
        END LOOP;
    END LOOP;
END $$;

-- 4.3 Seed Uniforms (Basic set for all schools)
DO $$
DECLARE
    school_rec RECORD;
    item_names TEXT[] := ARRAY['Shirt', 'Pant', 'Skirt', 'Tie', 'Blazer'];
    prices NUMERIC[] := ARRAY[450, 600, 550, 150, 1800];
    item_cats TEXT[] := ARRAY['Regular', 'Regular', 'Regular', 'Regular', 'Winter'];
    i INTEGER;
BEGIN
    FOR school_rec IN SELECT id FROM public.schools LOOP
        FOR i IN 1..5 LOOP
            INSERT INTO public.uniforms (school_id, grade, item_name, price, type, category)
            VALUES (school_rec.id, 'All', item_names[i], prices[i], 'Boys', item_cats[i]);
            
            -- Add Girls variants
             IF item_names[i] = 'Pant' THEN
                 INSERT INTO public.uniforms (school_id, grade, item_name, price, type, category)
                 VALUES (school_rec.id, 'All', 'Skirt', 550, 'Girls', 'Regular');
             ELSE
                 INSERT INTO public.uniforms (school_id, grade, item_name, price, type, category)
                 VALUES (school_rec.id, 'All', item_names[i], prices[i], 'Girls', item_cats[i]);
             END IF;
        END LOOP;
    END LOOP;
END $$;

-- 4.4 Seed Product Sizes (Default 100 stock for standard sizes)
-- This ensures 'create_order_with_receipt' does not fail on missing sizes
INSERT INTO public.product_sizes (uniform_id, size, stock)
SELECT u.id, s.size, 100
FROM public.uniforms u
CROSS JOIN (VALUES ('XS'), ('S'), ('M'), ('L'), ('XL'), ('XXL'), ('28'), ('30'), ('32'), ('34'), ('36'), ('38'), ('40')) AS s(size);
