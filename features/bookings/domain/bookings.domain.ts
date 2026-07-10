import { ValidationError } from "../../../shared/errors";

/**
 * Domain entity representing a Customer Booking.
 */
export class BookingEntity {
  public readonly bookingId: string;
  public readonly customerName: string;
  public readonly customerPhone: string;
  public readonly customerEmail: string;
  public readonly customerAddress: string;
  public readonly roomType: string;
  public readonly roomNumber: string;
  public readonly checkInDate: string;
  public readonly checkOutDate: string;
  public readonly guestCount: number;
  public readonly totalAmount: number;
  public readonly paymentStatus: "paid" | "unpaid" | "partial" | "partially-paid";
  public readonly bookingStatus: "confirmed" | "pending" | "checked-in" | "checked-out" | "cancelled";
  public readonly paymentMethod: string;
  public readonly advanceAmount: number;
  public readonly paymentProof: string;
  public readonly remarks: string;
  public readonly createdByUid?: string | null;
  public readonly deletedAt?: string | null;
  public readonly deletedBy?: string | null;
  public readonly deleteReason?: string | null;
 
  constructor(
    bookingId: string,
    customerName: string,
    customerPhone: string,
    customerEmail: string,
    customerAddress: string,
    roomType: string,
    roomNumber: string,
    checkInDate: string,
    checkOutDate: string,
    guestCount: number,
    totalAmount: number,
    paymentStatus: "paid" | "unpaid" | "partial" | "partially-paid",
    bookingStatus: "confirmed" | "pending" | "checked-in" | "checked-out" | "cancelled",
    paymentMethod: string,
    advanceAmount: number,
    paymentProof: string,
    remarks: string,
    createdByUid?: string | null,
    deletedAt?: string | null,
    deletedBy?: string | null,
    deleteReason?: string | null
  ) {
    this.bookingId = bookingId;
    this.customerName = customerName;
    this.customerPhone = customerPhone;
    this.customerEmail = customerEmail;
    this.customerAddress = customerAddress;
    this.roomType = roomType;
    this.roomNumber = roomNumber;
    this.checkInDate = checkInDate;
    this.checkOutDate = checkOutDate;
    this.guestCount = guestCount;
    this.totalAmount = totalAmount;
    this.paymentStatus = paymentStatus;
    this.bookingStatus = bookingStatus;
    this.paymentMethod = paymentMethod;
    this.advanceAmount = advanceAmount;
    this.paymentProof = paymentProof;
    this.remarks = remarks;
    this.createdByUid = createdByUid;
    this.deletedAt = deletedAt;
    this.deletedBy = deletedBy;
    this.deleteReason = deleteReason;
    this.validate();
  }

  /**
   * Retrieves outstanding balance due amount.
   */
  public getBalanceDue(): number {
    return Math.max(0, this.totalAmount - this.advanceAmount);
  }

  /**
   * Validates internal business constraints for booking transactions.
   * 
   * @throws ValidationError if validation checks fail.
   */
  public validate(): void {
    if (!this.customerName || this.customerName.trim() === "") {
      throw new ValidationError("Customer Name is required.");
    }
    const cleanPhone = this.customerPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length !== 10) {
      throw new ValidationError("Customer Phone number must be exactly 10 digits.");
    }
    const start = new Date(this.checkInDate);
    const end = new Date(this.checkOutDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      throw new ValidationError("Check-out date must occur after check-in date.");
    }
    if (this.totalAmount < 0) {
      throw new ValidationError("Total Amount cannot be negative.");
    }
    if (this.advanceAmount < 0 || this.advanceAmount > this.totalAmount) {
      throw new ValidationError("Advance Amount paid cannot be negative or exceed the total price.");
    }
  }
}
