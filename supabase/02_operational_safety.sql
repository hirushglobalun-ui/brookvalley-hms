-- Migration to implement Phase 3 Operational Safety (Soft Delete and Recovery)

-- 1. Alter business tables to support soft-delete fields
ALTER TABLE public.room_types ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.room_types ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT NULL;
ALTER TABLE public.room_types ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT NULL;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- 2. Add performance indexes for soft-delete queries
CREATE INDEX IF NOT EXISTS idx_room_types_deleted_at ON public.room_types(deleted_at);
CREATE INDEX IF NOT EXISTS idx_rooms_deleted_at ON public.rooms(deleted_at);
CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON public.bookings(deleted_at);

-- 3. Modify Row Level Security (RLS) policies for soft delete compliance

-- 3A. ROOM TYPES POLICIES
DROP POLICY IF EXISTS "Authenticated users can read room types" ON public.room_types;
DROP POLICY IF EXISTS "Authenticated users can read active room types" ON public.room_types;
DROP POLICY IF EXISTS "Admins can read deleted room types" ON public.room_types;

CREATE POLICY "Authenticated users can read active room types" 
  ON public.room_types FOR SELECT 
  TO authenticated 
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can read deleted room types" 
  ON public.room_types FOR SELECT 
  TO authenticated 
  USING (
    deleted_at IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3B. ROOMS POLICIES
DROP POLICY IF EXISTS "Authenticated users can read rooms" ON public.rooms;
DROP POLICY IF EXISTS "Authenticated users can read active rooms" ON public.rooms;
DROP POLICY IF EXISTS "Admins can read deleted rooms" ON public.rooms;

CREATE POLICY "Authenticated users can read active rooms" 
  ON public.rooms FOR SELECT 
  TO authenticated 
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can read deleted rooms" 
  ON public.rooms FOR SELECT 
  TO authenticated 
  USING (
    deleted_at IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3C. BOOKINGS POLICIES
DROP POLICY IF EXISTS "Authenticated users can read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can read active bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can read deleted bookings" ON public.bookings;

CREATE POLICY "Authenticated users can read active bookings" 
  ON public.bookings FOR SELECT 
  TO authenticated 
  USING (deleted_at IS NULL);

CREATE POLICY "Admins can read deleted bookings" 
  ON public.bookings FOR SELECT 
  TO authenticated 
  USING (
    deleted_at IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Transaction-safe Booking Soft Delete RPC
DROP FUNCTION IF EXISTS public.soft_delete_booking_safe(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.soft_delete_booking_safe(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.soft_delete_booking_safe(
  p_booking_id TEXT,
  p_delete_reason TEXT,
  p_actor_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room_number TEXT;
  v_rooms TEXT[];
  v_actor_name TEXT;
  v_actor_role TEXT;
  v_actor_uuid UUID;
BEGIN
  -- Cast actor to UUID safely if provided
  IF p_actor_id IS NOT NULL AND p_actor_id <> '' THEN
    v_actor_uuid := p_actor_id::UUID;
  END IF;

  -- Get actor details
  IF v_actor_uuid IS NOT NULL THEN
    SELECT full_name, role INTO v_actor_name, v_actor_role
    FROM public.profiles
    WHERE id = v_actor_uuid;
  END IF;

  -- Check if booking exists and is active
  SELECT room_number INTO v_room_number
  FROM public.bookings
  WHERE booking_id = p_booking_id AND deleted_at IS NULL;

  IF v_room_number IS NULL THEN
    RAISE EXCEPTION 'Booking not found or already deleted.';
  END IF;

  -- Parse room numbers
  v_rooms := string_to_array(replace(v_room_number, ' ', ''), ',');

  -- Update bookings table with soft-delete metadata
  UPDATE public.bookings
  SET 
    deleted_at = timezone('utc'::text, now()),
    deleted_by = v_actor_uuid,
    delete_reason = p_delete_reason,
    booking_status = 'cancelled', -- Mark status as cancelled to free up visual calendar/booking slots
    updated_at = timezone('utc'::text, now())
  WHERE booking_id = p_booking_id;

  -- Transition active rooms to dirty
  UPDATE public.rooms
  SET status = 'dirty'
  WHERE room_number = ANY(v_rooms) AND status = 'occupied';

  -- Log action to activity logs
  INSERT INTO public.activity_logs (action, details, user_id, user_name, user_role)
  VALUES (
    'booking.delete',
    'Booking ' || p_booking_id || ' soft-deleted. Reason: ' || coalesce(p_delete_reason, 'No reason specified'),
    v_actor_uuid,
    v_actor_name,
    v_actor_role
  );
END;
$$;

-- 5. Transaction-safe Booking Restore RPC
DROP FUNCTION IF EXISTS public.restore_booking_safe(TEXT, UUID);
DROP FUNCTION IF EXISTS public.restore_booking_safe(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.restore_booking_safe(
  p_booking_id TEXT,
  p_actor_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_record RECORD;
  v_conflict_booking TEXT;
  v_rooms TEXT[];
  v_actor_name TEXT;
  v_actor_role TEXT;
  v_actor_uuid UUID;
BEGIN
  -- Cast actor to UUID safely
  IF p_actor_id IS NULL OR p_actor_id = '' THEN
    RAISE EXCEPTION 'Actor ID is required for restoration auditing.';
  END IF;
  
  v_actor_uuid := p_actor_id::UUID;

  -- Assert caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_actor_uuid AND role = 'admin' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrator sessions can restore deleted records.';
  END IF;

  -- Retrieve soft-deleted booking record
  SELECT * INTO v_booking_record
  FROM public.bookings
  WHERE booking_id = p_booking_id AND deleted_at IS NOT NULL;

  IF v_booking_record IS NULL THEN
    RAISE EXCEPTION 'Deleted booking not found.';
  END IF;

  -- Parse room numbers
  v_rooms := string_to_array(replace(v_booking_record.room_number, ' ', ''), ',');

  -- Check if any assigned room is deleted/retired
  IF EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE room_number = ANY(v_rooms) AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Cannot restore: One or more assigned rooms have been deleted/retired.';
  END IF;

  -- Check double-booking conflicts on standard active bookings
  SELECT booking_id INTO v_conflict_booking
  FROM public.bookings
  WHERE 
    deleted_at IS NULL
    AND booking_status NOT IN ('cancelled', 'checked-out')
    AND check_in_date < v_booking_record.check_out_date
    AND check_out_date > v_booking_record.check_in_date
    AND string_to_array(replace(room_number, ' ', ''), ',') && v_rooms
  LIMIT 1;

  IF v_conflict_booking IS NOT NULL THEN
    RAISE EXCEPTION 'Conflict: Room % is already booked for these dates by booking %.', 
      v_booking_record.room_number, v_conflict_booking;
  END IF;

  -- Restore booking record by clearing metadata
  UPDATE public.bookings
  SET 
    deleted_at = NULL,
    deleted_by = NULL,
    delete_reason = NULL,
    booking_status = 'confirmed', -- Revert status to confirmed upon restore
    updated_at = timezone('utc'::text, now())
  WHERE booking_id = p_booking_id;

  -- Re-occupy room if check-in is active today
  IF v_booking_record.check_in_date <= CURRENT_DATE AND v_booking_record.check_out_date > CURRENT_DATE THEN
    UPDATE public.rooms
    SET status = 'occupied'
    WHERE room_number = ANY(v_rooms);
  END IF;

  -- Get actor details
  SELECT full_name, role INTO v_actor_name, v_actor_role
  FROM public.profiles
  WHERE id = v_actor_uuid;

  -- Log action to activity logs
  INSERT INTO public.activity_logs (action, details, user_id, user_name, user_role)
  VALUES (
    'booking.restore',
    'Booking ' || p_booking_id || ' restored by ' || v_actor_name,
    v_actor_uuid,
    v_actor_name,
    v_actor_role
  );
END;
$$;
