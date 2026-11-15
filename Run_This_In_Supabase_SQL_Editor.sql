-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Schools Table
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Bangalore',
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Classes Table
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    grade_name TEXT NOT NULL, -- LKG, UKG, 1st..12th
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Uniforms Table
CREATE TABLE IF NOT EXISTS uniforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    grade TEXT NOT NULL, -- Target Grade or 'All'
    item_name TEXT NOT NULL, -- Shirt, Pant, Skirt, Tie, Blazer
    price NUMERIC NOT NULL,
    image_url TEXT,
    type TEXT, -- 'Boys', 'Girls', 'Unisex'
    category TEXT, -- 'Summer', 'Winter', 'Regular'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code TEXT UNIQUE NOT NULL,
    student_name TEXT NOT NULL,
    school_id UUID REFERENCES schools(id),
    school_name TEXT, 
    grade TEXT NOT NULL,
    phone TEXT NOT NULL,
    total_amount NUMERIC NOT NULL,
    payment_method TEXT DEFAULT 'UPI', -- UPI, Cash, Card
    status TEXT DEFAULT 'Pending', -- Pending, Packed, Delivered
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    uniform_id UUID REFERENCES uniforms(id),
    item_name TEXT NOT NULL, 
    size TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE uniforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policies 
DROP POLICY IF EXISTS "Public read schools" ON schools;
CREATE POLICY "Public read schools" ON schools FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read classes" ON classes;
CREATE POLICY "Public read classes" ON classes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read uniforms" ON uniforms;
CREATE POLICY "Public read uniforms" ON uniforms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public create orders" ON orders;
CREATE POLICY "Public create orders" ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read orders" ON orders;
CREATE POLICY "Public read orders" ON orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public update orders" ON orders;
CREATE POLICY "Public update orders" ON orders FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public create order_items" ON order_items;
CREATE POLICY "Public create order_items" ON order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read order_items" ON order_items;
CREATE POLICY "Public read order_items" ON order_items FOR SELECT USING (true);


-- Functions
CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_code IS NULL THEN
      NEW.order_code := 'ORD-' || substring(md5(random()::text) from 1 for 6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_code ON orders;
CREATE TRIGGER set_order_code
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_code();


-- SEED DATA
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM uniforms;
DELETE FROM classes;
DELETE FROM schools;

INSERT INTO schools (name, area, city, logo_url) VALUES
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

DO $$
DECLARE
    school_rec RECORD;
    grades TEXT[] := ARRAY['LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
    g TEXT;
BEGIN
    FOR school_rec IN SELECT id FROM schools LOOP
        FOREACH g IN ARRAY grades LOOP
            INSERT INTO classes (school_id, grade_name) VALUES (school_rec.id, g);
        END LOOP;
    END LOOP;
END $$;

DO $$
DECLARE
    school_rec RECORD;
    item_names TEXT[] := ARRAY['Shirt', 'Pant', 'Skirt', 'Tie', 'Blazer'];
    prices NUMERIC[] := ARRAY[450, 600, 550, 150, 1800];
    item_cats TEXT[] := ARRAY['Regular', 'Regular', 'Regular', 'Regular', 'Winter'];
    i INTEGER;
BEGIN
    FOR school_rec IN SELECT id FROM schools LOOP
        FOR i IN 1..5 LOOP
            INSERT INTO uniforms (school_id, grade, item_name, price, type, category)
            VALUES (school_rec.id, 'All', item_names[i], prices[i], 'Boys', item_cats[i]);
            
             IF item_names[i] = 'Pant' THEN
                 INSERT INTO uniforms (school_id, grade, item_name, price, type, category)
                 VALUES (school_rec.id, 'All', 'Skirt', 550, 'Girls', 'Regular');
             ELSE
                 INSERT INTO uniforms (school_id, grade, item_name, price, type, category)
                 VALUES (school_rec.id, 'All', item_names[i], prices[i], 'Girls', item_cats[i]);
             END IF;
        END LOOP;
    END LOOP;
END $$;
