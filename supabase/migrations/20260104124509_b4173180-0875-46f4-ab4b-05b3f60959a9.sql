-- Create a test admin user via auth
-- First, we'll insert directly into auth.users for testing purposes
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '00000000-0000-0000-0000-000000000000',
  'admin@uniforms.com',
  crypt('Admin123!', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Distributor Admin"}',
  NOW(),
  NOW(),
  'authenticated',
  'authenticated',
  ''
);

-- Add this user to admin_users table
INSERT INTO admin_users (user_id, name)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Distributor Admin')
ON CONFLICT DO NOTHING;