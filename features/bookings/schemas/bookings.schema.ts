import { z } from "zod";

/**
 * Zod validation schema for creating a Booking.
 */
export const createBookingSchema = z.object({
  customerName: z.string().min(1, "Customer Name is required").max(100),
  customerPhone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  customerEmail: z.string().email("A valid email address is required").or(z.literal("")),
  customerAddress: z.string().max(250).optional(),
  roomType: z.string().min(1, "Room Type is required"),
  roomNumber: z.string().min(1, "Room Number is required"),
  checkInDate: z.string().min(1, "Check-in Date is required"),
  checkOutDate: z.string().min(1, "Check-out Date is required"),
  guestCount: z.number().int().min(1, "At least 1 guest required"),
  totalAmount: z.number().nonnegative("Total amount cannot be negative"),
  paymentStatus: z.enum(["paid", "unpaid", "partial", "partially-paid"]),
  bookingStatus: z.enum(["confirmed", "pending", "checked-in", "checked-out", "cancelled"]),
  paymentMethod: z.string().min(1, "Payment method is required"),
  advanceAmount: z.number().nonnegative("Advance amount cannot be negative"),
  paymentProof: z.string().optional(),
  remarks: z.string().optional()
});
