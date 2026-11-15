-- Schools table
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  area TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  fabric_info TEXT,
  fit_description TEXT,
  image_url TEXT,
  price DECIMAL(10,2) NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('boys', 'girls', 'unisex')),
  category TEXT NOT NULL CHECK (category IN ('shirt', 'trouser', 'skirt', 'blazer', 'sportswear')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Product sizes (available sizes for each product)
CREATE TABLE public.product_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size TEXT NOT NULL CHECK (size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL')),
  stock INTEGER NOT NULL DEFAULT 100,
  UNIQUE(product_id, size)
);

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  student_name TEXT NOT NULL,
  class TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('upi', 'offline')),
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Admin users table for distributor login
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Public read access for schools and products (for parent browsing)
CREATE POLICY "Anyone can view schools" ON public.schools FOR SELECT USING (true);
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Anyone can view product sizes" ON public.product_sizes FOR SELECT USING (true);

-- Anyone can create orders (parents don't need accounts)
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = _user_id
  )
$$;

-- Admin can view all orders
CREATE POLICY "Admins can view all orders" ON public.orders 
FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all order items" ON public.order_items 
FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view admin users" ON public.admin_users 
FOR SELECT USING (public.is_admin(auth.uid()));

-- Seed 15 Bangalore schools
INSERT INTO public.schools (name, area, logo_url) VALUES
('Delhi Public School', 'Whitefield', NULL),
('National Public School', 'Indiranagar', NULL),
('Ryan International School', 'Kundalahalli', NULL),
('Greenwood High', 'Sarjapur Road', NULL),
('Vidyashilp Academy', 'Yelahanka', NULL),
('Bishop Cotton Boys School', 'St. Marks Road', NULL),
('Bangalore International School', 'Hennur', NULL),
('Inventure Academy', 'Whitefield', NULL),
('Mallya Aditi International', 'Yelahanka', NULL),
('The Valley School', 'Kanakapura Road', NULL),
('Presidency School', 'RT Nagar', NULL),
('Vibgyor High', 'Marathahalli', NULL),
('Ebenezer International School', 'Electronic City', NULL),
('Harvest International School', 'Koramangala', NULL),
('Jain Heritage School', 'Hebbal', NULL);

-- Seed products for each school (simplified - 6 products per school)
INSERT INTO public.products (school_id, name, description, fabric_info, fit_description, image_url, price, gender, category)
SELECT 
  s.id,
  s.name || ' Boys Shirt',
  'Premium quality school uniform shirt for boys',
  '100% Cotton, Pre-shrunk, Easy Iron',
  'Regular fit with comfortable shoulder width',
  NULL,
  599.00,
  'boys',
  'shirt'
FROM public.schools s;

INSERT INTO public.products (school_id, name, description, fabric_info, fit_description, image_url, price, gender, category)
SELECT 
  s.id,
  s.name || ' Boys Trouser',
  'Durable school uniform trouser for boys',
  'Poly-Cotton blend, Wrinkle resistant',
  'Comfort fit with elastic waistband option',
  NULL,
  749.00,
  'boys',
  'trouser'
FROM public.schools s;

INSERT INTO public.products (school_id, name, description, fabric_info, fit_description, image_url, price, gender, category)
SELECT 
  s.id,
  s.name || ' Girls Shirt',
  'Premium quality school uniform shirt for girls',
  '100% Cotton, Pre-shrunk, Easy Iron',
  'Tailored fit with darted waist',
  NULL,
  599.00,
  'girls',
  'shirt'
FROM public.schools s;

INSERT INTO public.products (school_id, name, description, fabric_info, fit_description, image_url, price, gender, category)
SELECT 
  s.id,
  s.name || ' Girls Skirt',
  'Elegant school uniform skirt for girls',
  'Poly-Cotton blend, Pleated design',
  'A-line fit with adjustable waist',
  NULL,
  699.00,
  'girls',
  'skirt'
FROM public.schools s;

INSERT INTO public.products (school_id, name, description, fabric_info, fit_description, image_url, price, gender, category)
SELECT 
  s.id,
  s.name || ' Blazer',
  'Formal school blazer with embroidered logo',
  'Premium wool blend, Fully lined',
  'Classic fit with structured shoulders',
  NULL,
  1899.00,
  'unisex',
  'blazer'
FROM public.schools s;

INSERT INTO public.products (school_id, name, description, fabric_info, fit_description, image_url, price, gender, category)
SELECT 
  s.id,
  s.name || ' Sports T-Shirt',
  'Breathable sports uniform for PE classes',
  'Moisture-wicking polyester, UV protection',
  'Athletic fit for ease of movement',
  NULL,
  449.00,
  'unisex',
  'sportswear'
FROM public.schools s;

-- Add sizes for all products
INSERT INTO public.product_sizes (product_id, size, stock)
SELECT p.id, s.size, 100
FROM public.products p
CROSS JOIN (VALUES ('XS'), ('S'), ('M'), ('L'), ('XL')) AS s(size);