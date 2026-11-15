-- Allow safely checking whether any admins exist (no PII exposed)

CREATE OR REPLACE FUNCTION public.has_any_admins()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users)
$$;

-- Allow both anonymous and authenticated clients to call this function
GRANT EXECUTE ON FUNCTION public.has_any_admins() TO anon, authenticated;

-- Ensure verify_admin_access is callable by authenticated users
GRANT EXECUTE ON FUNCTION public.verify_admin_access() TO authenticated;