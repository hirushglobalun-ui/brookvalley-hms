// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
// Now we can import the repository and supabase client which will use the real credentials
import { BookingsRepository } from "../repository/bookingsRepository";
import { CreateBookingDTO } from "../dto/bookings.dto";
import { supabase } from "../../../lib/supabase";

const repo = new BookingsRepository();
const MOCK_USER = { uid: null, email: "test@brookvalley.com", role: "admin", fullName: "Test Admin" };

describe("Bookings RPC Integration Tests", { timeout: 30000 }, () => {
  // Cleanup helper
  const cleanUpTestBookings = async () => {
    console.log("Cleaning up test bookings...");
    const { error } = await supabase
      .from("bookings")
      .delete()
      .like("booking_id", "TEST-BK-%");
    if (error) {
      console.error("Cleanup failed:", error.message);
    } else {
      console.log("Cleanup succeeded");
    }
  };

  beforeAll(async () => {
    // Login to get session for RLS bypass
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: "admin@brookvalley.com",
      password: "admin123"
    });
    
    if (loginError) {
      console.warn("Integration tests: Admin login failed. RLS might block queries.", loginError.message);
    } else {
      console.log("Integration tests: Logged in successfully as admin UID:", loginData.user?.id);
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
    customerName: "Integration Test User",
    customerPhone: "5555550000",
    customerEmail: "test@example.com",
    customerAddress: "123 Test St",
    roomType: "hut-room",
    roomNumber,
    checkInDate,
    checkOutDate,
    guestCount: 2,
    totalAmount: 100,
    paymentStatus: "unpaid",
    bookingStatus: "confirmed",
    paymentMethod: "none",
    advanceAmount: 0,
    paymentProof: "",
    remarks: "Automated test booking"
  });

  it("Test A: Normal booking creation & room status assignment", async () => {
    const bookingId = `TEST-BK-${Date.now()}`;
    const dto = generateDto("101", "2050-07-01", "2050-07-05");

    // Execute
    await expect(repo.addBookingSafe(bookingId, dto, MOCK_USER)).resolves.not.toThrow();

    // Verify
    const booking = await repo.getBookingById(bookingId);
    expect(booking).not.toBeNull();
    expect(booking?.roomNumber).toBe("101");
  });

  it("Test B: Double-booking prevention (overlapping dates)", async () => {
    const bookingId1 = `TEST-BK-1-${Date.now()}`;
    const bookingId2 = `TEST-BK-2-${Date.now()}`;
    
    // Create first booking
    const dto1 = generateDto("102", "2050-08-10", "2050-08-15");
    await repo.addBookingSafe(bookingId1, dto1, MOCK_USER);

    // Try to book the same room with overlapping dates (Aug 12 to Aug 18)
    const dto2 = generateDto("102", "2050-08-12", "2050-08-18");
    
    // Expect the transaction to fail with the specific Double Booking error
    await expect(repo.addBookingSafe(bookingId2, dto2, MOCK_USER))
      .rejects.toThrow(/Double Booking Detected/i);
  });

  it("Test C: Boundary date test (checkout day = check-in day)", async () => {
    const bookingId1 = `TEST-BK-1-${Date.now()}`;
    const bookingId2 = `TEST-BK-2-${Date.now()}`;
    
    // Booking 1: 20th to 22nd
    const dto1 = generateDto("103", "2050-09-20", "2050-09-22");
    await repo.addBookingSafe(bookingId1, dto1, MOCK_USER);

    // Booking 2: 22nd to 24th (should succeed because checkout on 22nd means it is free on 22nd afternoon)
    const dto2 = generateDto("103", "2050-09-22", "2050-09-24");
    
    await expect(repo.addBookingSafe(bookingId2, dto2, MOCK_USER)).resolves.not.toThrow();
  });

  it("Test D: Booking update logic", async () => {
    const bookingId = `TEST-BK-${Date.now()}`;
    
    // Initial booking for room 101
    const dto = generateDto("101", "2050-10-01", "2050-10-05");
    await repo.addBookingSafe(bookingId, dto, MOCK_USER);

    // Update booking to change room to 102
    const updatedDto = { ...dto, roomNumber: "102" };
    await expect(repo.updateBookingSafe(bookingId, updatedDto)).resolves.not.toThrow();

    const booking = await repo.getBookingById(bookingId);
    expect(booking?.roomNumber).toBe("102");
  });

  it("Test E: Cancellation logic", async () => {
    const bookingId = `TEST-BK-${Date.now()}`;
    const dto = generateDto("103", "2050-11-01", "2050-11-05");
    
    await repo.addBookingSafe(bookingId, dto, MOCK_USER);
    
    // Cancel the booking
    const cancelDto: CreateBookingDTO = { ...dto, bookingStatus: "cancelled" };
    await expect(repo.updateBookingSafe(bookingId, cancelDto)).resolves.not.toThrow();
    
    const booking = await repo.getBookingById(bookingId);
    expect(booking?.bookingStatus).toBe("cancelled");
  });

  it("Test F: Multi-room conflict handling", async () => {
    const bookingId1 = `TEST-BK-1-${Date.now()}`;
    const bookingId2 = `TEST-BK-2-${Date.now()}`;
    
    // Guest A books room 101
    const dto1 = generateDto("101", "2050-12-01", "2050-12-05");
    await repo.addBookingSafe(bookingId1, dto1, MOCK_USER);

    // Guest B tries to book 101 AND 102 for the same dates
    const dto2 = generateDto("101, 102", "2050-12-01", "2050-12-05");
    
    // The entire booking should fail because 101 overlaps
    await expect(repo.addBookingSafe(bookingId2, dto2, MOCK_USER))
      .rejects.toThrow(/Double Booking Detected/i);
  });
});
