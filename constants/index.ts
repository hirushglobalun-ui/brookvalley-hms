/**
 * Centralized constant definitions for the Brookvalley Hotel Management System (HMS).
 * Provides type-safe mappings for booking statuses, payment states, roles, and UI styles.
 */

export const BOOKING_STATUS = {
  CONFIRMED: "confirmed",
  PENDING: "pending",
  CHECKED_IN: "checked-in",
  CHECKED_OUT: "checked-out",
  CANCELLED: "cancelled"
} as const;

export type BookingStatus = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];

export const PAYMENT_STATUS = {
  PAID: "paid",
  PARTIAL: "partial",
  UNPAID: "unpaid"
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

export const ROOM_STATUS = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  MAINTENANCE: "maintenance"
} as const;

export type RoomStatus = typeof ROOM_STATUS[keyof typeof ROOM_STATUS];

export const USER_ROLE = {
  ADMIN: "admin",
  EMPLOYEE: "employee"
} as const;

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

export const ROOM_STATUS_LABELS = {
  [ROOM_STATUS.AVAILABLE]: "AVAILABLE",
  [ROOM_STATUS.OCCUPIED]: "OCCUPIED",
  [ROOM_STATUS.MAINTENANCE]: "MAINTENANCE"
} as const;
