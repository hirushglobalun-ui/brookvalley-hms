/**
 * Utility functions for room number matching and room type resolution across Brookvalley HMS.
 */

import { Booking, Room, RoomType } from "../types";

/**
 * Robustly matches an input room number string against a target room's roomNumber.
 * Handles exact matches, case-insensitivity, normalization (e.g. "P-01" vs "P01"),
 * and numeric leading zero comparisons (e.g. "01" vs "1"), while ensuring alphanumeric
 * codes like "P01" never incorrectly collide with numeric room numbers like "1".
 * 
 * @param inputNumber - Room number from booking or user input.
 * @param targetRoomNumber - Room number from DB room object.
 * @returns boolean indicating if the room numbers match.
 */
export const matchRoomNumber = (inputNumber: string, targetRoomNumber: string): boolean => {
  if (!inputNumber || !targetRoomNumber) return false;

  const normInput = inputNumber.trim().toUpperCase();
  const normTarget = targetRoomNumber.trim().toUpperCase();

  // 1. Direct exact match
  if (normInput === normTarget) return true;

  // 2. Normalized alphanumeric comparison (ignoring dashes and spaces, e.g. "P-01" === "P01")
  const alphaNumInput = normInput.replace(/[^A-Z0-9]/g, "");
  const alphaNumTarget = normTarget.replace(/[^A-Z0-9]/g, "");

  if (alphaNumInput && alphaNumInput === alphaNumTarget) return true;

  // 3. Leading zero numeric comparison ONLY if BOTH inputs strictly consist of digits
  const isInputNumeric = /^\d+$/.test(alphaNumInput);
  const isTargetNumeric = /^\d+$/.test(alphaNumTarget);

  if (isInputNumeric && isTargetNumeric) {
    const numInput = alphaNumInput.replace(/^0+/, "") || "0";
    const numTarget = alphaNumTarget.replace(/^0+/, "") || "0";
    return numInput === numTarget;
  }

  return false;
};

/**
 * Resolves the room type display name for a given room number string.
 * 
 * @param rNum - Room number string (e.g. "P01", "1")
 * @param rooms - Available room list
 * @param roomTypes - Available room type list
 * @param fallbackTypeId - Fallback room type ID or name
 * @returns The resolved room type display name.
 */
export const getRoomTypeForNumber = (
  rNum: string,
  rooms?: Room[],
  roomTypes?: RoomType[],
  fallbackTypeId: string = ""
): string => {
  const roomObj = rooms?.find(r => matchRoomNumber(rNum, r.roomNumber));
  const rtObj = roomTypes?.find(rt => rt.id === roomObj?.roomType) || roomTypes?.find(rt => rt.id === fallbackTypeId);
  return rtObj?.name || fallbackTypeId;
};

/**
 * Sorts bookings such that:
 * 1. Current & Upcoming bookings (checkOutDate >= today or checkInDate >= today) appear FIRST,
 *    sorted chronologically in ASCENDING order of checkInDate (e.g. 1st, 2nd, 3rd, 4th...).
 * 2. Past bookings (checkOutDate < today) are pushed to the BOTTOM,
 *    sorted in DESCENDING order of checkInDate (most recent past bookings first).
 * 
 * @param bookingsList - Array of Booking objects to sort.
 * @returns Sorted copy of the bookings array.
 */
export const sortBookingsBySmartDate = (bookingsList: Booking[]): Booking[] => {
  if (!bookingsList || bookingsList.length === 0) return [];
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  return [...bookingsList].sort((a, b) => {
    const isAPast = (a.checkOutDate || a.checkInDate) < todayStr;
    const isBPast = (b.checkOutDate || b.checkInDate) < todayStr;

    // Upcoming/Current bookings come before Past bookings
    if (!isAPast && isBPast) return -1;
    if (isAPast && !isBPast) return 1;

    // Both are Upcoming/Current: sort by checkInDate ASCENDING (1st, 2nd, 3rd...)
    if (!isAPast && !isBPast) {
      if (a.checkInDate !== b.checkInDate) {
        return a.checkInDate.localeCompare(b.checkInDate);
      }
      return a.bookingId.localeCompare(b.bookingId);
    }

    // Both are Past: sort by checkInDate DESCENDING (most recent past first)
    if (a.checkInDate !== b.checkInDate) {
      return b.checkInDate.localeCompare(a.checkInDate);
    }
    return b.bookingId.localeCompare(a.bookingId);
  });
};
