export interface School {
  id: string;
  name: string;
  area: string;
  city: string;
  logo_url: string | null;
  created_at: string;
  school_code: string;
}

export interface SchoolClass {
  id: string;
  school_id: string;
  grade_name: string;
  created_at: string;
}

export interface ColorVariant {
  name: string;       // e.g. "Red"
  hex: string;        // e.g. "#EF4444"
  image_url: string | null;
}

export interface Uniform {
  id: string;
  school_id: string;
  grade: string;
  item_name: string;
  description?: string | null;
  description_image_url?: string | null;
  price: number;
  image_url: string | null;
  type: string; // 'Boys', 'Girls', 'Unisex'
  category: string; // 'Regular', 'summer', 'winter'
  image_urls: string[] | null;
  colors?: ColorVariant[] | null;
  size_config?: {
    type: 'single' | 'dual';
    dimensions: {
      name: string;
      values: string[];
    }[];
  } | null;
  stock?: Record<string, number> | null;
  created_at: string;
}

export interface CartItem {
  uniform: Uniform;
  size: string;
  quantity: number;
  school: School;
  color?: string | null; // e.g. "Red", "Blue" — set when item has colour variants
}

export interface Order {
  id: string;
  order_code: string;
  school_id: string;
  school_name: string;
  student_name: string;
  grade: string;
  phone: string;
  payment_method: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  uniform_id: string;
  item_name: string;
  size: string;
  color?: string | null;
  quantity: number;
  price: number;
  created_at: string;
}

export type FilterGender = 'all' | 'Boys' | 'Girls' | 'Unisex';
export type FilterCategory = 'all' | 'Regular' | 'Summer' | 'Winter' | 'Shirt' | 'Pant' | 'Skirt' | 'Blazer' | 'Tie' | 'Short' | 'Pino';
export type FilterSize = 'all' | '9' | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '20' | '22' | '24' | '26' | '28' | '30' | '32' | '34' | '36' | '38' | '40' | '42' | '44';
