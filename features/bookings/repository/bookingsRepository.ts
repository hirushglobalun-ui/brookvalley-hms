import { supabase } from "../../../lib/supabase";
import { DatabaseError } from "../../../shared/errors";
import { BookingEntity } from "../domain/bookings.domain";
import { CreateBookingDTO, BookingsMapper } from "../dto/bookings.dto";

/**
 * Repository wrapping all database interactions for bookings.
 */
export class BookingsRepository {
  /**
   * Retrieves paginated reservations from the database.
   */
  public async getBookings(page: number = 1, limit: number = 50): Promise<{ data: BookingEntity[], count: number }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from("bookings")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new DatabaseError("Failed to fetch bookings", error.code);
    }
    return {
      data: (data || []).map(BookingsMapper.toEntity),
      count: count || 0
    };
  }

  /**
   * Retrieves a single booking metadata row.
   */
  public async getBookingById(bookingId: string): Promise<BookingEntity | null> {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("booking_id", bookingId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to fetch booking: ${bookingId}`, error.code);
    }
    return data ? BookingsMapper.toEntity(data) : null;
  }

  /**
   * Inserts a new customer reservation safely via Postgres RPC.
   * Prevents double bookings and atomically updates room statuses.
   */
  public async addBookingSafe(bookingId: string, dto: CreateBookingDTO, user: any): Promise<void> {
    const { error } = await supabase.rpc("create_booking_safe", {
      p_booking_id: bookingId,
      p_customer_name: dto.customerName,
      p_customer_phone: dto.customerPhone,
      p_customer_email: dto.customerEmail,
      p_customer_address: dto.customerAddress || "",
      p_room_type_id: dto.roomType,
      p_room_number: dto.roomNumber,
      p_check_in_date: dto.checkInDate,
      p_check_out_date: dto.checkOutDate,
      p_guest_count: Number(dto.guestCount),
      p_total_amount: Number(dto.totalAmount),
      p_payment_status: dto.paymentStatus,
      p_booking_status: dto.bookingStatus,
      p_payment_method: dto.paymentMethod || "none",
      p_advance_amount: Number(dto.advanceAmount || 0),
      p_payment_proof: dto.paymentProof || "",
      p_remarks: dto.remarks || "",
      p_created_by_uid: user.uid,
      p_created_by_name: user.fullName || user.email,
      p_created_by_role: user.role
    });

    if (error) {
      if (error.message.includes("DOUBLE_BOOKING_ERROR")) {
        throw new DatabaseError("Double Booking Detected: The selected room is already booked for these dates.", error.code);
      }
      throw new DatabaseError("Failed to insert booking record: " + error.message, error.code);
    }
  }

  /**
   * Modifies an existing customer reservation safely via Postgres RPC.
   * Prevents overlap with other bookings and handles room status atomicity.
   */
  public async updateBookingSafe(bookingId: string, dto: CreateBookingDTO): Promise<void> {
    const { error } = await supabase.rpc("update_booking_safe", {
      p_booking_id: bookingId,
      p_customer_name: dto.customerName,
      p_customer_phone: dto.customerPhone,
      p_customer_email: dto.customerEmail,
      p_customer_address: dto.customerAddress || "",
      p_room_type_id: dto.roomType,
      p_room_number: dto.roomNumber,
      p_check_in_date: dto.checkInDate,
      p_check_out_date: dto.checkOutDate,
      p_guest_count: Number(dto.guestCount),
      p_total_amount: Number(dto.totalAmount),
      p_payment_status: dto.paymentStatus,
      p_booking_status: dto.bookingStatus,
      p_payment_method: dto.paymentMethod || "none",
      p_advance_amount: Number(dto.advanceAmount || 0),
      p_payment_proof: dto.paymentProof || "",
      p_remarks: dto.remarks || ""
    });

    if (error) {
      if (error.message.includes("DOUBLE_BOOKING_ERROR")) {
        throw new DatabaseError("Double Booking Detected: The selected room is already booked for these dates.", error.code);
      }
      throw new DatabaseError(`Failed to update booking record: ${bookingId}. ${error.message}`, error.code);
    }
  }

  /**
   * Soft-deletes a customer reservation record.
   */
  public async deleteBooking(bookingId: string, reason: string = "Accidental entry / Admin cleanup", actor: any = { uid: null }): Promise<void> {
    const { error } = await supabase.rpc("soft_delete_booking_safe", {
      p_booking_id: bookingId,
      p_delete_reason: reason,
      p_actor_id: actor?.uid || null
    });
    if (error) {
      throw new DatabaseError(`Failed to soft delete booking: ${bookingId}. ${error.message}`, error.code);
    }
  }

  /**
   * Retrieves all soft-deleted reservations (Admin Only).
   */
  public async getDeletedBookings(): Promise<BookingEntity[]> {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) {
      throw new DatabaseError("Failed to fetch soft-deleted bookings", error.code);
    }
    return (data || []).map(BookingsMapper.toEntity);
  }

  /**
   * Restores a soft-deleted reservation safely (Admin Only).
   */
  public async restoreBooking(bookingId: string, actor: any): Promise<void> {
    const { error } = await supabase.rpc("restore_booking_safe", {
      p_booking_id: bookingId,
      p_actor_id: actor?.uid || null
    });
    if (error) {
      throw new DatabaseError(`Failed to restore booking: ${bookingId}. ${error.message}`, error.code);
    }
  }

  /**
   * Permanently purges a soft-deleted reservation (Admin Only).
   */
  public async purgeBooking(bookingId: string): Promise<void> {
    const { error } = await supabase.from("bookings").delete().eq("booking_id", bookingId);
    if (error) {
      throw new DatabaseError(`Failed to permanently purge booking: ${bookingId}`, error.code);
    }
  }

  /**
   * Wipes all customer bookings.
   */
  public async clearAllBookings(): Promise<void> {
    const { error } = await supabase.from("bookings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      throw new DatabaseError("Failed to clear bookings from database", error.code);
    }
  }
}
