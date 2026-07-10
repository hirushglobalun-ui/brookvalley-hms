import { BookingEntity } from "../domain/bookings.domain";

/**
 * Payload interface for registering a new customer reservation.
 */
export interface CreateBookingDTO {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  roomType: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  totalAmount: number;
  paymentStatus: "paid" | "unpaid" | "partial" | "partially-paid";
  bookingStatus: "confirmed" | "pending" | "checked-in" | "checked-out" | "cancelled";
  paymentMethod: string;
  advanceAmount: number;
  paymentProof?: string;
  remarks?: string;
}

/**
 * Maps raw database reservations to Domain Entities.
 */
export class BookingsMapper {
  /**
   * Maps database raw booking row to BookingEntity.
   */
  public static toEntity(row: any): BookingEntity {
    return new BookingEntity(
      row.booking_id,
      row.customer_name,
      row.customer_phone,
      row.customer_email,
      row.customer_address || "",
      row.room_type_id,
      row.room_number,
      row.check_in_date,
      row.check_out_date,
      Number(row.guest_count),
      Number(row.total_amount),
      row.payment_status,
      row.booking_status,
      row.payment_method,
      Number(row.advance_amount || 0),
      row.payment_proof || "",
      row.remarks || "",
      row.created_by_uid,
      row.deleted_at,
      row.deleted_by,
      row.delete_reason
    );
  }
}
