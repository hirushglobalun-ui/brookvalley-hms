// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { BookingsRepository } from "../repository/bookingsRepository";
import { CreateBookingDTO } from "../dto/bookings.dto";
import { supabase } from "../../../lib/supabase";

const repo = new BookingsRepository();
const MOCK_USER = { uid: "a4c53a9e-1e3a-404a-8438-cc819ad1544d", email: "admin@brookvalley.com", role: "admin", fullName: "System Admin" };

describe("Bookings Safety & Soft-Delete Integration Tests", { timeout: 30000 }, () => {
  const cleanUpTestBookings = async () => {
    console.log("Cleaning up test bookings...");
    const { error } = await supabase
      .from("bookings")
      .delete()
      .like("booking_id", "TEST-SF-%");
    if (error) {
      console.error("Cleanup failed:", error.message);
    } else {
      console.log("Cleanup succeeded");
    }
  };

  beforeAll(async () => {
    // Sign in as admin to bypass RLS policies
    const { error } = await supabase.auth.signInWithPassword({
      email: "admin@brookvalley.com",
      password: "admin123"
    });
    if (error) {
      console.warn("Failed admin login inside safety tests:", error.message);
    }
    await cleanUpTestBookings();
  });

  afterEach(async () => {
    await cleanUpTestBookings();
  });

  afterAll(async () => {
    await cleanUpTestBookings();
    await supabase.auth.signOut();
  });

  const generateDto = (
    roomNumber: string,
    checkInDate: string,
    checkOutDate: string
  ): CreateBookingDTO => ({
    customerName: "Safety Integration User",
    customerPhone: "5555551234",
    customerEmail: "safety-test@example.com",
    customerAddress: "999 Safety Ave",
    roomType: "hut-room",
    roomNumber,
    checkInDate,
    checkOutDate,
    guestCount: 2,
    totalAmount: 120,
    paymentStatus: "unpaid",
    bookingStatus: "confirmed",
    paymentMethod: "none",
    advanceAmount: 0,
    paymentProof: "",
    remarks: "Safety integration test record"
  });

  it("Test A: Soft delete verification", async () => {
    const bookingId = `TEST-SF-A-${Date.now()}`;
    const dto = generateDto("101", "2051-01-01", "2051-01-05");

    // 1. Create booking
    await expect(repo.addBookingSafe(bookingId, dto, MOCK_USER)).resolves.not.toThrow();

    // 2. Soft delete it
    await expect(repo.deleteBooking(bookingId, "Accidental duplicate booking", MOCK_USER)).resolves.not.toThrow();

    // 3. Verify it is excluded from standard SELECT queries
    const activeBooking = await repo.getBookingById(bookingId);
    expect(activeBooking).toBeNull();

    // 4. Verify it is visible in the admin deleted bookings list
    const deletedBookings = await repo.getDeletedBookings();
    const matches = deletedBookings.filter(b => b.bookingId === bookingId);
    expect(matches.length).toBe(1);
    expect(matches[0].deleteReason).toBe("Accidental duplicate booking");
  });

  it("Test B: RLS Access Enforcement", async () => {
    const bookingId = `TEST-SF-B-${Date.now()}`;
    const dto = generateDto("101", "2051-02-01", "2051-02-05");

    // Create a booking and soft delete it
    await repo.addBookingSafe(bookingId, dto, MOCK_USER);
    await repo.deleteBooking(bookingId, "RLS check", MOCK_USER);

    // Sign out to test unauthenticated access
    await supabase.auth.signOut();

    // Standard client read should filter out all rows under RLS (returning empty list)
    const anonymousDeleted = await repo.getDeletedBookings();
    expect(anonymousDeleted.length).toBe(0);

    // Log back in as admin for subsequent tests
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email: "admin@brookvalley.com",
      password: "admin123"
    });
    if (loginErr) {
      console.error("Failed to re-login in Test B:", loginErr.message);
    }
  });

  it("Test C: Restore Validation (Successful restoration)", async () => {
    const bookingId = `TEST-SF-C-${Date.now()}`;
    const dto = generateDto("102", "2051-03-01", "2051-03-05");

    // 1. Create and delete booking
    await repo.addBookingSafe(bookingId, dto, MOCK_USER);
    await repo.deleteBooking(bookingId, "Temporary delete", MOCK_USER);

    // 2. Restore booking
    await expect(repo.restoreBooking(bookingId, MOCK_USER)).resolves.not.toThrow();

    // Debug check: Print the raw database row state
    const rawRes = await supabase.from("bookings").select("*").eq("booking_id", bookingId).single();
    console.log("DEBUG [Test C] - Raw booking record after restore:", rawRes.data);
    console.log("DEBUG [Test C] - Query error (if any):", rawRes.error);

    // 3. Verify it is active and readable again
    const activeBooking = await repo.getBookingById(bookingId);
    expect(activeBooking).not.toBeNull();
    expect(activeBooking?.bookingId).toBe(bookingId);
    expect(activeBooking?.deletedAt).toBeNull();
  });

  it("Test D: Restore Validation (Overlap/Double-Booking Conflict)", async () => {
    const bookingIdA = `TEST-SF-D1-${Date.now()}`;
    const bookingIdB = `TEST-SF-D2-${Date.now()}`;
    
    // Booking A for room 103: March 10 to March 15
    const dtoA = generateDto("103", "2051-04-10", "2051-04-15");
    
    // Booking B for room 103: March 12 to March 18 (overlaps Booking A)
    const dtoB = generateDto("103", "2051-04-12", "2051-04-18");

    // 1. Create and soft-delete Booking A
    await repo.addBookingSafe(bookingIdA, dtoA, MOCK_USER);
    await repo.deleteBooking(bookingIdA, "Overlap test prep", MOCK_USER);

    // 2. Create Booking B (succeeds because Booking A is soft-deleted/cancelled)
    await expect(repo.addBookingSafe(bookingIdB, dtoB, MOCK_USER)).resolves.not.toThrow();

    // 3. Try to restore Booking A -> must throw overlap conflict exception
    await expect(repo.restoreBooking(bookingIdA, MOCK_USER))
      .rejects.toThrow(/Conflict: Room 103 is already booked/i);
  });
});
