-- Migration to add transaction-safe booking creation and overlap checking
-- This must be executed in the Supabase SQL editor or via Supabase CLI migrations.

-- 0. Alter table constraints to support reserved and dirty room states
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_status_check CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved', 'dirty'));

CREATE OR REPLACE FUNCTION public.create_booking_safe(
  p_booking_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_customer_address TEXT,
  p_room_type_id TEXT,
  p_room_number TEXT,
  p_check_in_date DATE,
  p_check_out_date DATE,
  p_guest_count INTEGER,
  p_total_amount NUMERIC,
  p_payment_status TEXT,
  p_booking_status TEXT,
  p_payment_method TEXT,
  p_advance_amount NUMERIC,
  p_payment_proof TEXT,
  p_remarks TEXT,
  p_created_by_uid UUID,
  p_created_by_name TEXT,
  p_created_by_role TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_rooms TEXT[];
  v_conflict_booking TEXT;
BEGIN
  -- 1. Parse comma-separated rooms into a PostgreSQL array
  v_rooms := string_to_array(replace(p_room_number, ' ', ''), ',');

  -- 2. Concurrency Lock
  PERFORM 1 FROM public.rooms WHERE room_number = ANY(v_rooms) FOR UPDATE;
  
  -- 3. Overlap Check
  SELECT booking_id INTO v_conflict_booking
  FROM public.bookings
  WHERE 
    booking_status NOT IN ('cancelled', 'checked-out')
    AND check_in_date < p_check_out_date
    AND check_out_date > p_check_in_date
    AND string_to_array(replace(room_number, ' ', ''), ',') && v_rooms
  LIMIT 1;

  IF v_conflict_booking IS NOT NULL THEN
    RAISE EXCEPTION 'DOUBLE_BOOKING_ERROR: Room is already booked for these dates. (Conflict ID: %)', v_conflict_booking;
  END IF;

  -- 4. Insert the booking safely
  INSERT INTO public.bookings (
    booking_id, customer_name, customer_phone, customer_email, customer_address,
    room_type_id, room_number, check_in_date, check_out_date, guest_count,
    total_amount, payment_status, booking_status, payment_method, advance_amount,
    payment_proof, remarks, created_by_uid, created_by_name, created_by_role
  ) VALUES (
    p_booking_id, p_customer_name, p_customer_phone, p_customer_email, p_customer_address,
    p_room_type_id, p_room_number, p_check_in_date, p_check_out_date, p_guest_count,
    p_total_amount, p_payment_status, p_booking_status, p_payment_method, p_advance_amount,
    p_payment_proof, p_remarks, p_created_by_uid, p_created_by_name, p_created_by_role
  );

  -- 5. Atomic Room Status Update
  IF p_check_in_date <= CURRENT_DATE AND p_check_out_date > CURRENT_DATE THEN
    IF p_booking_status = 'checked-in' THEN
      UPDATE public.rooms SET status = 'occupied' WHERE room_number = ANY(v_rooms);
    ELSE
      UPDATE public.rooms SET status = 'reserved' WHERE room_number = ANY(v_rooms);
    END IF;
  END IF;

  RETURN p_booking_id;
END;
$$;

-- RPC for updating an existing booking
CREATE OR REPLACE FUNCTION public.update_booking_safe(
  p_booking_id TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_customer_address TEXT,
  p_room_type_id TEXT,
  p_room_number TEXT,
  p_check_in_date DATE,
  p_check_out_date DATE,
  p_guest_count INTEGER,
  p_total_amount NUMERIC,
  p_payment_status TEXT,
  p_booking_status TEXT,
  p_payment_method TEXT,
  p_advance_amount NUMERIC,
  p_payment_proof TEXT,
  p_remarks TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_new_rooms TEXT[];
  v_old_rooms TEXT[];
  v_conflict_booking TEXT;
  v_old_status TEXT;
  v_old_room_number TEXT;
BEGIN
  v_new_rooms := string_to_array(replace(p_room_number, ' ', ''), ',');

  -- Lock rooms
  PERFORM 1 FROM public.rooms WHERE room_number = ANY(v_new_rooms) FOR UPDATE;

  -- Get old booking state
  SELECT booking_status, room_number INTO v_old_status, v_old_room_number
  FROM public.bookings WHERE booking_id = p_booking_id;
  
  v_old_rooms := string_to_array(replace(v_old_room_number, ' ', ''), ',');

  -- Check overlaps, excluding the CURRENT booking
  SELECT booking_id INTO v_conflict_booking
  FROM public.bookings
  WHERE 
    booking_id != p_booking_id
    AND booking_status NOT IN ('cancelled', 'checked-out')
    AND check_in_date < p_check_out_date
    AND check_out_date > p_check_in_date
    AND string_to_array(replace(room_number, ' ', ''), ',') && v_new_rooms
  LIMIT 1;

  IF v_conflict_booking IS NOT NULL THEN
    RAISE EXCEPTION 'DOUBLE_BOOKING_ERROR: Room is already booked for these dates. (Conflict ID: %)', v_conflict_booking;
  END IF;

  -- Free old rooms if status changed to cancelled/checked-out or rooms changed
  IF p_booking_status = 'cancelled' OR v_old_room_number != p_room_number THEN
    UPDATE public.rooms SET status = 'available' WHERE room_number = ANY(v_old_rooms) AND status IN ('occupied', 'reserved');
  ELSIF p_booking_status = 'checked-out' THEN
    UPDATE public.rooms SET status = 'dirty' WHERE room_number = ANY(v_old_rooms) AND status IN ('occupied', 'reserved');
  END IF;

  -- Update Booking
  UPDATE public.bookings SET
    customer_name = p_customer_name,
    customer_phone = p_customer_phone,
    customer_email = p_customer_email,
    customer_address = p_customer_address,
    room_type_id = p_room_type_id,
    room_number = p_room_number,
    check_in_date = p_check_in_date,
    check_out_date = p_check_out_date,
    guest_count = p_guest_count,
    total_amount = p_total_amount,
    payment_status = p_payment_status,
    booking_status = p_booking_status,
    payment_method = p_payment_method,
    advance_amount = p_advance_amount,
    payment_proof = p_payment_proof,
    remarks = p_remarks,
    updated_at = timezone('utc'::text, now())
  WHERE booking_id = p_booking_id;

  -- Occupy new rooms if checked-in today
  IF p_check_in_date <= CURRENT_DATE AND p_check_out_date > CURRENT_DATE THEN
    IF p_booking_status = 'checked-in' THEN
      UPDATE public.rooms SET status = 'occupied' WHERE room_number = ANY(v_new_rooms);
    ELSIF p_booking_status != 'cancelled' AND p_booking_status != 'checked-out' THEN
      UPDATE public.rooms SET status = 'reserved' WHERE room_number = ANY(v_new_rooms);
    END IF;
  END IF;
END;
$$;
