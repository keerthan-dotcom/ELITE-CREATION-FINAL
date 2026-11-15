-- Create a function to make first user an admin
CREATE OR REPLACE FUNCTION public.make_first_user_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- If no admins exist, make this user an admin
  IF NOT EXISTS (SELECT 1 FROM public.admin_users) THEN
    INSERT INTO public.admin_users (user_id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Admin'));
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_make_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_make_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.make_first_user_admin();