-- Migration to support developer actions (updating admin credentials)
CREATE OR REPLACE FUNCTION public.update_admin_credentials_direct(
  p_new_email TEXT,
  p_new_password TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Assert caller is developer or admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (email = 'dev@hirush.com' OR role = 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only developer or administrator accounts can update admin credentials.';
  END IF;

  -- Find the admin user ID from public.profiles where role = 'admin'
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin user profile not found.';
  END IF;

  -- Update email and password in auth.users
  IF p_new_password IS NOT NULL AND p_new_password <> '' THEN
    v_encrypted_password := crypt(p_new_password, gen_salt('bf'));
    UPDATE auth.users
    SET email = p_new_email,
        encrypted_password = v_encrypted_password,
        email_change = '',
        email_confirmed_at = now(),
        updated_at = now()
    WHERE id = v_admin_id;
  ELSE
    UPDATE auth.users
    SET email = p_new_email,
        email_change = '',
        email_confirmed_at = now(),
        updated_at = now()
    WHERE id = v_admin_id;
  END IF;

  -- Update public.profiles
  UPDATE public.profiles
  SET email = p_new_email
  WHERE id = v_admin_id;

  -- Update public.employees
  UPDATE public.employees
  SET email = p_new_email
  WHERE user_id = v_admin_id;
END;
$$;
