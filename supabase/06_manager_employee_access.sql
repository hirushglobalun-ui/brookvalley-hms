-- Update create_employee_secure to allow managers and developers
CREATE OR REPLACE FUNCTION public.create_employee_secure(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_role TEXT,
  p_password TEXT,
  p_notes TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_employee_id TEXT;
  v_encrypted_password TEXT;
BEGIN
  -- Assert caller is admin, manager, or developer
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'developer') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only active administrator or manager sessions can invoke employee account creation.';
  END IF;

  -- Verify employee email doesn't already exist
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'This email is already registered.';
  END IF;

  -- Generate unique EMP ID
  v_employee_id := 'EMP' || floor(100000 + random() * 900000)::text;
  v_user_id := gen_random_uuid();
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

  -- Insert user record into Supabase Auth
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    v_encrypted_password,
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('fullName', p_full_name, 'role', p_role),
    'authenticated',
    'authenticated',
    now(),
    now()
  );

  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (v_user_id, p_email, p_full_name, p_role, 'active');

  -- Insert employee specific details
  INSERT INTO public.employees (uid, employee_id, full_name, email, phone, role, joined_date, notes)
  VALUES (v_user_id, v_employee_id, p_full_name, p_email, p_phone, p_role, CURRENT_DATE, p_notes);

  RETURN v_employee_id;
END;
$$;


-- Update delete_employee_secure to allow managers and developers
CREATE OR REPLACE FUNCTION public.delete_employee_secure(
  p_uid UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  -- Assert caller is admin, manager, or developer
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'developer') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only active administrator or manager sessions can invoke employee account deletion.';
  END IF;

  -- Delete from auth.users (will cascade delete profiles and employees)
  DELETE FROM auth.users WHERE id = p_uid;
END;
$$;
