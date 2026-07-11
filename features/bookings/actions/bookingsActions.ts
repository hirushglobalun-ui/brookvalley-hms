"use server";

import { BookingsService } from "../services/bookingsService";
import { CreateBookingDTO } from "../dto/bookings.dto";
import { revalidatePath } from "next/cache";

const service = new BookingsService();

/**
 * Server Action: Registers a new customer reservation transaction.
 */
export async function addBookingAction(dto: CreateBookingDTO, user: any) {
  const bookingId = await service.addBooking(dto, user);
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  return bookingId;
}

/**
 * Server Action: Updates an existing customer reservation configuration.
 */
export async function updateBookingAction(bookingId: string, dto: CreateBookingDTO, user: any) {
  await service.updateBooking(bookingId, dto, user);
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

/**
 * Server Action: Soft-deletes a customer reservation record.
 */
export async function deleteBookingAction(bookingId: string, roomNumber: string, user: any, reason: string = "Accidental entry / Admin cleanup") {
  await service.deleteBooking(bookingId, roomNumber, user, reason);
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

/**
 * Server Action: Fetches all soft-deleted bookings.
 */
export async function getDeletedBookingsAction(adminUser: any) {
  return await service.getDeletedBookings(adminUser);
}

/**
 * Server Action: Restores a soft-deleted booking.
 */
export async function restoreBookingAction(bookingId: string, adminUser: any) {
  await service.restoreBooking(bookingId, adminUser);
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

/**
 * Server Action: Permanently purges a soft-deleted booking.
 */
export async function purgeBookingAction(bookingId: string, adminUser: any) {
  await service.purgeBooking(bookingId, adminUser);
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

/**
 * Server Action: Wipes all customer bookings records.
 */
export async function clearAllBookingsAction(adminUser: any) {
  await service.clearAllBookings(adminUser);
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}
