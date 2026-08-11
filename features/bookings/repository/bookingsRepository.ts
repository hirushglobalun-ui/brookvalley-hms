import { supabase } from "../../../lib/supabase";
import { DatabaseError } from "../../../shared/errors";
import { BookingEntity } from "../domain/bookings.domain";
import { CreateBookingDTO, BookingsMapper } from "../dto/bookings.dto";
import { syncToFirestore, deleteFromFirestore, fetchFallbackFromFirestore } from "../../../lib/firebase";

/**
 * Repository wrapping all database interactions for bookings.
 */
export class BookingsRepository {
  /**
   * Retrieves paginated reservations from the database.
   */
  public async getBookings(page: number = 1, limit: number = 50, userId?: string): Promise<{ data: BookingEntity[], count: number }> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("bookings")
      .select("*", { count: "exact" });

    if (userId) {
      query = query.eq("created_by_uid", userId);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.warn("Supabase fetch failed, attempting Firebase fallback for bookings...");
      const fbData = await fetchFallbackFromFirestore("bookings");
      if (fbData.length > 0) {
        return {
          data: fbData.map(BookingsMapper.toEntity),
          count: fbData.length
        };
      }
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
      .maybeSingle();

    if (error) {
      throw new DatabaseError(`Failed to fetch booking: ${bookingId}`, error.code);
    }
    return data ? BookingsMapper.toEntity(data) : null;
  }

  /**
   * Inserts a new customer reservation record.
   */
  public async addBookingSafe(bookingId: string, dto: CreateBookingDTO, user: any): Promise<void> {
    let activeUid = user?.uid || user?.id || (dto as any)?.createdByUid;
    let activeName = user?.fullName || user?.email || (dto as any)?.createdByName;
    let activeRole = user?.role || (dto as any)?.createdByRole;

    if (!activeUid) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          activeUid = authData.user.id;
          activeName = activeName || authData.user.email || "Employee";
          activeRole = activeRole || "employee";
        }
      } catch (e) {
        console.error("Failed to resolve active user for booking creation:", e);
      }
    }

    const payload = {
      booking_id: bookingId,
      customer_name: dto.customerName,
      customer_phone: dto.customerPhone,
      customer_email: dto.customerEmail || "",
      customer_address: dto.customerAddress || "",
      room_type_id: dto.roomType,
      room_number: dto.roomNumber,
      check_in_date: dto.checkInDate,
      check_out_date: dto.checkOutDate,
      guest_count: Number(dto.guestCount),
      total_amount: Number(dto.totalAmount),
      payment_status: dto.paymentStatus,
      booking_status: dto.bookingStatus,
      payment_method: dto.paymentMethod || "none",
      advance_amount: Number(dto.advanceAmount || 0),
      payment_proof: dto.paymentProof || "",
      remarks: dto.remarks || "",
      created_by_uid: activeUid || null,
      created_by_name: activeName || "Staff",
      created_by_role: activeRole || "employee",
      booking_source: dto.bookingSource || "direct",
      agency_commission: Number(dto.agencyCommission || 0)
    };

    const { error } = await supabase
      .from("bookings")
      .insert(payload);

    if (error) {
      console.warn("Supabase database unavailable/paused. Writing to Firebase fallback...", error.message);
      await syncToFirestore("bookings", bookingId, payload);
      return;
    }

    syncToFirestore("bookings", bookingId, payload).catch(console.error);
  }

  /**
   * Modifies an existing customer reservation.
   */
  public async updateBookingSafe(bookingId: string, dto: CreateBookingDTO): Promise<void> {
    const payload = {
      booking_id: bookingId,
      customer_name: dto.customerName,
      customer_phone: dto.customerPhone,
      customer_email: dto.customerEmail || "",
      customer_address: dto.customerAddress || "",
      room_type_id: dto.roomType,
      room_number: dto.roomNumber,
      check_in_date: dto.checkInDate,
      check_out_date: dto.checkOutDate,
      guest_count: Number(dto.guestCount),
      total_amount: Number(dto.totalAmount),
      payment_status: dto.paymentStatus,
      booking_status: dto.bookingStatus,
      payment_method: dto.paymentMethod || "none",
      advance_amount: Number(dto.advanceAmount || 0),
      payment_proof: dto.paymentProof || "",
      remarks: dto.remarks || "",
      booking_source: dto.bookingSource || "direct",
      agency_commission: Number(dto.agencyCommission || 0),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("bookings")
      .update(payload)
      .eq("booking_id", bookingId);

    if (error) {
      console.warn("Supabase database unavailable/paused. Updating Firebase fallback...", error.message);
      await syncToFirestore("bookings", bookingId, payload);
      return;
    }

    syncToFirestore("bookings", bookingId, payload).catch(console.error);
  }

  /**
   * Deletes a customer reservation record.
   */
  public async deleteBooking(bookingId: string, _reason: string = "Admin cleanup", _actor: any = { uid: null }): Promise<void> {
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("booking_id", bookingId);

    if (error) {
      console.warn("Supabase database unavailable/paused. Deleting from Firebase fallback...", error.message);
      await deleteFromFirestore("bookings", bookingId);
      return;
    }

    deleteFromFirestore("bookings", bookingId).catch(console.error);
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
