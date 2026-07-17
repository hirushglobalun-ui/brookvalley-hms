import { BookingsRepository } from "../repository/bookingsRepository";
import { CreateBookingDTO } from "../dto/bookings.dto";
import { createBookingSchema } from "../schemas/bookings.schema";
import { Logger } from "../../../shared/logger/logger";
import { logActivity } from "../../../services/activityService";
import { ValidationError } from "../../../shared/errors";
import { Booking } from "../../../types";

const repo = new BookingsRepository();

let cachedBookings: { data: Booking[], count: number, timestamp: number } | null = null;
const CACHE_TTL = 15000; // 15 seconds

/**
 * Service orchestrating customer reservations and date validations.
 */
export class BookingsService {
  /**
   * Retrieves paginated bookings list records.
   */
  public async getBookings(page: number = 1, limit: number = 50, userId?: string): Promise<{ data: Booking[], count: number }> {
    // Return cache if valid and it's the standard dashboard query
    if (page === 1 && limit === 50 && !userId) {
      if (cachedBookings && Date.now() - cachedBookings.timestamp < CACHE_TTL) {
        return cachedBookings;
      }
    }

    const { data: entities, count } = await repo.getBookings(page, limit, userId);
    const result = {
      data: entities.map(e => ({
        id: e.bookingId,
        bookingId: e.bookingId,
        customerName: e.customerName,
        customerPhone: e.customerPhone,
        customerEmail: e.customerEmail,
        customerAddress: e.customerAddress,
        roomType: e.roomType,
        roomNumber: e.roomNumber,
        checkInDate: e.checkInDate,
        checkOutDate: e.checkOutDate,
        guestCount: e.guestCount,
        totalAmount: e.totalAmount,
        paymentStatus: e.paymentStatus,
        bookingStatus: e.bookingStatus,
        paymentMethod: e.paymentMethod,
        advanceAmount: e.advanceAmount,
        paymentProof: e.paymentProof,
        remarks: e.remarks,
        createdByUid: e.createdByUid || null,
        createdByName: e.createdByName || null,
        createdByRole: e.createdByRole || null,
        createdAt: null,
        updatedAt: null
      })),
      count
    };

    if (page === 1 && limit === 50 && !userId) {
      cachedBookings = { ...result, timestamp: Date.now() };
    }

    return result;
  }

  /**
   * Registers a new customer booking via transaction-safe RPC.
   * Atomically handles overlap validation and room status updates.
   */
  public async addBooking(dto: CreateBookingDTO, user: any): Promise<string> {
    const parse = createBookingSchema.safeParse(dto);
    if (!parse.success) {
      throw new ValidationError("Invalid booking specifications", parse.error.flatten().fieldErrors as any);
    }

    const bookingId = "BK" + Math.floor(100000 + Math.random() * 900000);
    Logger.info("Creating new customer reservation", { bookingId, customer: dto.customerName, actor: user?.email });

    // Calling the transaction-safe RPC wrapper
    await repo.addBookingSafe(bookingId, dto, user);

    await logActivity(
      "CREATE_BOOKING",
      `Created booking ${bookingId} for Room(s) ${dto.roomNumber} (${dto.customerName})`,
      user
    );

    cachedBookings = null;
    return bookingId;
  }

  /**
   * Modifies an existing customer reservation via transaction-safe RPC.
   * Adjusts physical room occupancy statuses atomically.
   */
  public async updateBooking(bookingId: string, dto: CreateBookingDTO, user: any): Promise<void> {
    const parse = createBookingSchema.safeParse(dto);
    if (!parse.success) {
      throw new ValidationError("Invalid booking specs", parse.error.flatten().fieldErrors as any);
    }

    Logger.info("Modifying customer booking safely", { bookingId, actor: user?.email });
    
    // Calls the transaction-safe RPC wrapper
    await repo.updateBookingSafe(bookingId, dto);

    await logActivity(
      "UPDATE_BOOKING",
      `Updated booking ${bookingId} (Room(s) ${dto.roomNumber})`,
      user
    );
    cachedBookings = null;
  }

  /**
   * Updates only the booking status with a descriptive activity log.
   * Used by dashboard and bookings table quick-status dropdowns.
   */
  public async updateBookingStatus(
    bookingId: string,
    oldStatus: string,
    newStatus: Booking["bookingStatus"],
    booking: any,
    user: any
  ): Promise<void> {
    Logger.info("Quick status update", { bookingId, oldStatus, newStatus, actor: user?.email });

    await repo.updateBookingSafe(bookingId, { ...booking, bookingStatus: newStatus });

    await logActivity(
      "UPDATE_BOOKING_STATUS",
      `Changed booking ${bookingId} status: ${oldStatus} → ${newStatus} (Room ${booking.roomNumber}, ${booking.customerName})`,
      user
    );
    cachedBookings = null;
  }

  /**
   * Soft-deletes a reservation from database and releases occupied rooms.
   */
  public async deleteBooking(
    bookingId: string,
    roomNumber: string,
    user: any,
    reason: string = "Accidental entry / Admin cleanup"
  ): Promise<void> {
    Logger.error("Soft deleting customer reservation record", undefined, { bookingId, roomNumber, actor: user?.email });
    
    // Invoke repository soft-delete via postgres RPC
    await repo.deleteBooking(bookingId, reason, user);

    await logActivity("DELETE_BOOKING", `Soft-deleted booking ${bookingId}. Reason: ${reason}`, user);
    cachedBookings = null;
  }

  /**
   * Retrieves all soft-deleted reservations.
   */
  public async getDeletedBookings(adminUser: any): Promise<Booking[]> {
    if (adminUser?.role !== "admin") {
      throw new ValidationError("Unauthorized: Only administrators can query deleted records.");
    }
    const entities = await repo.getDeletedBookings();
    return entities.map(e => ({
      id: e.bookingId,
      bookingId: e.bookingId,
      customerName: e.customerName,
      customerPhone: e.customerPhone,
      customerEmail: e.customerEmail,
      customerAddress: e.customerAddress,
      roomType: e.roomType,
      roomNumber: e.roomNumber,
      checkInDate: e.checkInDate,
      checkOutDate: e.checkOutDate,
      guestCount: e.guestCount,
      totalAmount: e.totalAmount,
      paymentStatus: e.paymentStatus,
      bookingStatus: e.bookingStatus,
      paymentMethod: e.paymentMethod,
      advanceAmount: e.advanceAmount,
      paymentProof: e.paymentProof,
      remarks: e.remarks,
      createdByUid: e.createdByUid || null,
      deletedAt: e.deletedAt || null,
      deletedBy: e.deletedBy || null,
      deleteReason: e.deleteReason || null,
      createdAt: null,
      updatedAt: null
    }));
  }

  /**
   * Safely restores a soft-deleted reservation (running overlap validation).
   */
  public async restoreBooking(bookingId: string, adminUser: any): Promise<void> {
    if (adminUser?.role !== "admin") {
      throw new ValidationError("Unauthorized: Only administrators can restore deleted records.");
    }
    Logger.info("Restoring soft-deleted booking", { bookingId, actor: adminUser?.email });
    await repo.restoreBooking(bookingId, adminUser);
    await logActivity("RESTORE_BOOKING", `Restored soft-deleted booking ${bookingId}`, adminUser);
    cachedBookings = null;
  }

  /**
   * Permanently purges a soft-deleted reservation.
   */
  public async purgeBooking(bookingId: string, adminUser: any): Promise<void> {
    if (adminUser?.role !== "admin") {
      throw new ValidationError("Unauthorized: Only administrators can purge records.");
    }
    Logger.error("Permanently purging booking record", undefined, { bookingId, actor: adminUser?.email });
    await repo.purgeBooking(bookingId);
    await logActivity("PURGE_BOOKING", `Permanently purged booking ${bookingId}`, adminUser);
    cachedBookings = null;
  }

  /**
   * Wipes all customer reservations.
   */
  public async clearAllBookings(adminUser: any): Promise<void> {
    Logger.error("Executing wipe bookings sequence", undefined, { actor: adminUser?.email });
    await repo.clearAllBookings();
    await logActivity("CLEAR_ALL_BOOKINGS", "Cleared all bookings records and reset room availability status", adminUser);
    cachedBookings = null;
  }
}
