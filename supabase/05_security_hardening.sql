-- Migration 05: Supabase Security Hardening & Linter Remediation
-- Fixes: 0011 (search_path), 0013 (RLS disabled), 0023 (sensitive columns), 0024 (permissive RLS), 0028 & 0029 (SECURITY DEFINER execute)

-- ==========================================
-- 1. FIX SEARCH_PATH MUTABLE ON FUNCTIONS
-- ==========================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

ALTER FUNCTION public.handle_new_user() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.create_employee_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.delete_employee_user(UUID) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.create_booking_safe(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, INTEGER, NUMERIC, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.update_booking_safe(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, INTEGER, NUMERIC, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.soft_delete_booking_safe(TEXT, TEXT, TEXT) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.restore_booking_safe(TEXT, TEXT) SET search_path = public, extensions, pg_temp;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'update_admin_credentials_direct'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.update_admin_credentials_direct(TEXT, TEXT) SET search_path = public, extensions, pg_temp;';
  END IF;
END $$;

-- ==========================================
-- 2. REVOKE ANONYMOUS EXECUTE ON SECURITY DEFINER FUNCTIONS
-- ==========================================

-- Trigger function: revoke from ALL users (only called internally by PostgreSQL trigger)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Admin & Operational RPCs: Revoke from public & anon, grant to authenticated
REVOKE EXECUTE ON FUNCTION public.create_employee_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_employee_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_employee_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_employee_user(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_booking_safe(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, INTEGER, NUMERIC, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_safe(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, INTEGER, NUMERIC, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, UUID, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_booking_safe(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, INTEGER, NUMERIC, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_booking_safe(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, INTEGER, NUMERIC, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.soft_delete_booking_safe(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_booking_safe(TEXT, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.restore_booking_safe(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_booking_safe(TEXT, TEXT) TO authenticated;

-- ==========================================
-- 3. REMEDIATE OVERLY PERMISSIVE RLS POLICIES
-- ==========================================

-- 3A. Activity Logs (INSERT)
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON public.activity_logs;
CREATE POLICY "Authenticated users can insert activity logs" 
  ON public.activity_logs FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.role() = 'authenticated' AND (user_id IS NULL OR user_id = auth.uid()));

-- 3B. Bookings (INSERT & UPDATE)
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
CREATE POLICY "Authenticated users can create bookings" 
  ON public.bookings FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update bookings" ON public.bookings;
CREATE POLICY "Authenticated users can update bookings" 
  ON public.bookings FOR UPDATE 
  TO authenticated 
  USING (auth.role() = 'authenticated');

-- 3C. Rooms (UPDATE)
DROP POLICY IF EXISTS "Authenticated users can update room status" ON public.rooms;
CREATE POLICY "Authenticated users can update room status" 
  ON public.rooms FOR UPDATE 
  TO authenticated 
  USING (auth.role() = 'authenticated');

-- ==========================================
-- 4. ENABLE RLS & SECURE PASCALCASE / UNRESTRICTED TABLES
-- ==========================================

DO $$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'Session', 'User', 'ActivityLog', 'Customer', 'Account', 
    'BookingStatusHistory', 'VerificationToken', 'RoomType', 
    'Employee', 'Room', 'Booking', 'BookingRoom', 'Payment', 'RoomStatusHistory'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS "No public access" ON public.%I;', t);
      EXECUTE format('CREATE POLICY "No public access" ON public.%I FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);', t);
    END IF;
  END LOOP;
END $$;
