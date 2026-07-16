-- Enable pgcrypto for password hashing in SQL-based user creation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. PROFILES TABLE (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT CHECK (role IN ('admin', 'employee', 'manager', 'developer')) NOT NULL DEFAULT 'employee',
  status TEXT CHECK (status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT CHECK (role IN ('admin', 'employee', 'manager', 'developer')) NOT NULL DEFAULT 'employee',
  status TEXT CHECK (status IN ('active', 'inactive')) NOT NULL DEFAULT 'active',
  joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. ROOM TYPES TABLE
CREATE TABLE IF NOT EXISTS public.room_types (
  id TEXT PRIMARY KEY, -- Slug matching Firestore (e.g. hut-room)
  name TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT UNIQUE NOT NULL,
  room_type_id TEXT REFERENCES public.room_types(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('available', 'occupied', 'maintenance')) NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT UNIQUE NOT NULL, -- BKXXXXXX
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_address TEXT DEFAULT '',
  room_type_id TEXT REFERENCES public.room_types(id) ON DELETE RESTRICT,
  room_number TEXT NOT NULL, -- Comma-separated
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guest_count INTEGER NOT NULL CHECK (guest_count > 0),
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  payment_status TEXT CHECK (payment_status IN ('paid', 'unpaid', 'partial', 'partially-paid')) NOT NULL DEFAULT 'unpaid',
  booking_status TEXT CHECK (booking_status IN ('confirmed', 'pending', 'checked-in', 'checked-out', 'cancelled')) NOT NULL DEFAULT 'confirmed',
  payment_method TEXT NOT NULL DEFAULT 'none',
  advance_amount NUMERIC NOT NULL DEFAULT 0 CHECK (advance_amount >= 0),
  payment_proof TEXT DEFAULT '',
  remarks TEXT DEFAULT '',
  created_by_uid UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_by_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT,
  user_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- --- INDEXES FOR PERFORMANCE AND INTEGRITY ---
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON public.rooms(room_number);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type_id ON public.rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON public.bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_type_id ON public.bookings(room_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_by_uid ON public.bookings(created_by_uid);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_date ON public.bookings(check_in_date);
CREATE INDEX IF NOT EXISTS idx_bookings_check_out_date ON public.bookings(check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_status ON public.bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);

-- --- TRIGGER HELPERS FOR AUTOMATED PROFILE SYNC ---
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, status)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'System User'),
    new.email,
    CASE WHEN new.email = 'admin@brookvalley.com' THEN 'admin'::text ELSE 'employee'::text END,
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- If first admin registers, create their employee profile as well
  IF new.email = 'admin@brookvalley.com' THEN
    INSERT INTO public.employees (employee_id, user_id, full_name, email, phone, role, status, joined_date, notes)
    VALUES (
      'EMP888888',
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', 'System Admin'),
      new.email,
      '+1 555-0199',
      'admin',
      'active',
      CURRENT_DATE,
      'System Administrator'
    )
    ON CONFLICT (employee_id) DO NOTHING;
  END IF;
  
  RETURN new;
END;
$$;

-- Register the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --- SECURE ADMINISTRATIVE USER CREATION RPC ---
CREATE OR REPLACE FUNCTION public.create_employee_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_phone TEXT,
  p_role TEXT,
  p_status TEXT,
  p_joined_date DATE,
  p_notes TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_employee_id TEXT;
  v_encrypted_password TEXT;
BEGIN
  -- Assert caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only active administrator sessions can invoke employee account creation.';
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
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    recovery_token,
    phone_change,
    phone_change_token
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    v_encrypted_password,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', p_full_name),
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  );

  -- Explicitly update profile details created by the automated sync trigger
  UPDATE public.profiles
  SET 
    full_name = p_full_name,
    phone = p_phone,
    role = p_role,
    status = p_status
  WHERE id = v_user_id;

  -- Create matching row in employees
  INSERT INTO public.employees (
    employee_id,
    user_id,
    full_name,
    email,
    phone,
    role,
    status,
    joined_date,
    notes
  )
  VALUES (
    v_employee_id,
    v_user_id,
    p_full_name,
    p_email,
    p_phone,
    p_role,
    p_status,
    p_joined_date,
    p_notes
  );

  RETURN v_employee_id;
END;
$$;

-- --- SECURE ADMINISTRATIVE USER DELETION RPC ---
CREATE OR REPLACE FUNCTION public.delete_employee_user(
  p_uid UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Assert caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only active administrator sessions can invoke employee account deletion.';
  END IF;

  -- Delete from auth.users (will cascade delete profiles and employees)
  DELETE FROM auth.users WHERE id = p_uid;
END;
$$;

-- --- ROW LEVEL SECURITY (RLS) ---
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
CREATE POLICY "Authenticated users can read profiles" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Admins can update profiles" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. EMPLOYEES POLICIES
CREATE POLICY "Admins can manage employees" 
  ON public.employees FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Employees can read their own employee record" 
  ON public.employees FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- 3. ROOM TYPES POLICIES
CREATE POLICY "Authenticated users can read room types" 
  ON public.room_types FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can manage room types" 
  ON public.room_types FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. ROOMS POLICIES
CREATE POLICY "Authenticated users can read rooms" 
  ON public.rooms FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can update room status"
  ON public.rooms FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage rooms" 
  ON public.rooms FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. BOOKINGS POLICIES
CREATE POLICY "Authenticated users can read bookings" 
  ON public.bookings FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can create bookings" 
  ON public.bookings FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update bookings" 
  ON public.bookings FOR UPDATE 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can delete bookings" 
  ON public.bookings FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. ACTIVITY LOGS POLICIES
CREATE POLICY "Admins can read activity logs" 
  ON public.activity_logs FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can insert activity logs" 
  ON public.activity_logs FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Admins can delete activity logs" 
  ON public.activity_logs FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
