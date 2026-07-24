-- 1. FIX ROLE CONSTRAINTS (Allows saving 'manager' role to database)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'employee', 'manager', 'developer'));

ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_role_check CHECK (role IN ('admin', 'employee', 'manager', 'developer'));

-- 2. FIX RLS POLICIES (Allows Managers to see and edit the employee list)
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Admins and Managers can manage employees" ON public.employees;
CREATE POLICY "Admins and Managers can manage employees" 
  ON public.employees FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'developer')
    )
  );

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and Managers can update profiles" ON public.profiles;
CREATE POLICY "Admins and Managers can update profiles" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'developer')
    )
  );

-- 3. FIX RPC FUNCTIONS (Allows Managers to securely create/delete accounts)
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
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'developer') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only active administrator or manager sessions can invoke employee account creation.';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'This email is already registered.';
  END IF;

  v_employee_id := 'EMP' || floor(100000 + random() * 900000)::text;
  v_user_id := gen_random_uuid();
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at) 
  VALUES (v_user_id, '00000000-0000-0000-0000-000000000000', p_email, v_encrypted_password, now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('fullName', p_full_name, 'role', p_role), 'authenticated', 'authenticated', now(), now());

  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (v_user_id, p_email, p_full_name, p_role, 'active');

  INSERT INTO public.employees (uid, employee_id, full_name, email, phone, role, joined_date, notes)
  VALUES (v_user_id, v_employee_id, p_full_name, p_email, p_phone, p_role, CURRENT_DATE, p_notes);

  RETURN v_employee_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_employee_secure(p_uid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'manager', 'developer') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only active administrator or manager sessions can invoke employee account deletion.';
  END IF;

  DELETE FROM auth.users WHERE id = p_uid;
END;
$$;
