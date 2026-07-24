"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../../../lib/auth";
import { 
  BookingsService,
  BookingTable,
  BookingDetailModal,
  BookingFormModal
} from "../../../features/bookings";
import { SettingsService } from "../../../features/settings";
import { formatDate } from "../../../lib/db";
import { Plus, Search } from "lucide-react";
import { Booking, Room, RoomType } from "../../../types";
import { SkeletonTable } from "../../../components/ui/Skeleton";

const bookingsService = new BookingsService();
const settingsService = new SettingsService();

let bookingsCache: {
  bookings: Booking[];
  rooms: Room[];
  roomTypes: RoomType[];
  totalPages: number;
} | null = null;

/**
 * Core Bookings Dashboard controller.
 * Orchestrates filtering queries, loading data, auth states, and subcomponent modals.
 */
const BookingsContent: React.FC = () => {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  
  // Data States
  const [bookings, setBookings] = useState<Booking[]>(bookingsCache?.bookings || []);
  const [rooms, setRooms] = useState<Room[]>(bookingsCache?.rooms || []);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(bookingsCache?.roomTypes || []);
  const [loading, setLoading] = useState(!bookingsCache);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(bookingsCache?.totalPages || 1);
  const limit = 50;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roomTypeFilter, setRoomTypeFilter] = useState("all");

  // Modal Overlay States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  // Cache for calendar prefill redirects
  const [prefillParams, setPrefillParams] = useState<{ checkInDate?: string; checkOutDate?: string; roomNumber?: string } | null>(null);

  // Initial Data loading sequence
  const initialLoad = async (currentPage: number = page) => {
    try {
      if (!bookingsCache) setLoading(true);
      const filterUserId = user?.role !== "admin" ? user?.uid : undefined;
      const [bookingsRes, rList, rtList] = await Promise.all([
        bookingsService.getBookings(currentPage, limit, filterUserId),
        settingsService.getRooms(),
        settingsService.getRoomTypes()
      ]);
      
      bookingsCache = {
        bookings: bookingsRes.data,
        rooms: rList,
        roomTypes: rtList,
        totalPages: Math.ceil(bookingsRes.count / limit)
      };
      
      setBookings(bookingsCache.bookings);
      setTotalPages(bookingsCache.totalPages);
      setRooms(bookingsCache.rooms);
      setRoomTypes(bookingsCache.roomTypes);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initialLoad(page);
  }, [page]);

  const refreshData = async () => {
    try {
      const [bookingsRes, rList, rtList] = await Promise.all([
        bookingsService.getBookings(page, limit),
        settingsService.getRooms(),
        settingsService.getRoomTypes()
      ]);
      setBookings(bookingsRes.data);
      setTotalPages(Math.ceil(bookingsRes.count / limit));
      setRooms(rList);
      setRoomTypes(rtList);
    } catch (err) {
      console.error(err);
    }
  };

  // Check for prefill query parameters sent from the calendar page click
  useEffect(() => {
    const prefillCheckIn = searchParams.get("prefill_checkin");
    const prefillCheckOut = searchParams.get("prefill_checkout");
    const prefillRoom = searchParams.get("prefill_room");

    if (prefillCheckIn && prefillCheckOut && prefillRoom) {
      setPrefillParams({
        checkInDate: prefillCheckIn,
        checkOutDate: prefillCheckOut,
        roomNumber: prefillRoom
      });
      setSelectedBooking(null);
      setIsFormOpen(true);
    }
  }, [searchParams]);

  // Form submit handler (Create / Edit)
  const handleFormSubmit = async (formData: any) => {
    if (selectedBooking) {
      // Editing
      await bookingsService.updateBooking(selectedBooking.bookingId, formData, user);
    } else {
      // Creating
      await bookingsService.addBooking(formData, user);
    }
    refreshData();
  };

  // Quick status update from table row
  const handleQuickUpdateStatus = async (bId: string, newStatus: Booking["bookingStatus"]) => {
    const booking = bookings.find(b => b.bookingId === bId);
    if (!booking) return;

    let updatedBooking = { ...booking };

    if (newStatus === "checked-out" && booking.paymentStatus !== "paid") {
      const balance = (booking.totalAmount || 0) - (booking.advanceAmount || 0);
      if (balance > 0) {
        const confirmPay = window.confirm(`This booking has a pending balance of ₹${balance}.\nHas the customer paid this amount?\n\nClick OK to automatically mark the payment as PAID.`);
        if (confirmPay) {
          updatedBooking.paymentStatus = "paid";
          updatedBooking.advanceAmount = booking.totalAmount;
        }
      }
    }

    try {
      await bookingsService.updateBookingStatus(bId, booking.bookingStatus, newStatus, updatedBooking, user);
      refreshData();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  // Delete booking handler
  const handleDeleteBooking = async (bId: string, rNum: string) => {
    if (!window.confirm(`Are you sure you want to delete booking ${bId}?`)) return;
    const reason = window.prompt("Please specify a reason for soft-deleting this booking:");
    if (reason === null) return; // User cancelled prompt

    await bookingsService.deleteBooking(bId, rNum, user, reason.trim() || "Accidental entry / Admin cleanup");
    refreshData();
  };

  // Apply filters
  const filteredBookings = bookings.filter(b => {
    const matchStatus = statusFilter === "all" || b.bookingStatus === statusFilter;
    const matchRoomType = roomTypeFilter === "all" || b.roomType === roomTypeFilter;
    
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchStatus && matchRoomType;

    const matchQuery = 
      b.bookingId.toLowerCase().includes(query) ||
      b.customerName.toLowerCase().includes(query) ||
      b.customerPhone.includes(query) ||
      b.customerEmail.toLowerCase().includes(query) ||
      (b.roomNumber && b.roomNumber.toLowerCase().includes(query));

    return matchStatus && matchRoomType && matchQuery;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Upper header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Reservations</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Add, edit, view, and track guest check-in statuses.
          </p>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={() => {
            setSelectedBooking(null);
            setPrefillParams(null);
            setIsFormOpen(true);
          }}
        >
          <Plus size={16} /> New Booking
        </button>
      </div>

      {/* Filters card */}
      <div className="card" style={{ padding: "1rem 1.25rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
          <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            className="input-control"
            style={{ paddingLeft: "2.25rem", margin: 0 }}
            placeholder="Search by ID, name, phone, or room..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select 
          className="input-control" 
          style={{ width: "auto", minWidth: 160, margin: 0 }}
          value={roomTypeFilter}
          onChange={e => setRoomTypeFilter(e.target.value)}
        >
          <option value="all">All Room Types</option>
          {roomTypes.map(rt => (
            <option key={rt.id} value={rt.id}>{rt.name}</option>
          ))}
        </select>
        <select 
          className="input-control" 
          style={{ width: "auto", minWidth: 160, margin: 0 }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="checked-in">Checked-In</option>
          <option value="checked-out">Checked-Out</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Main Records Table view */}
      {loading ? (
        <SkeletonTable columns={6} rows={6} />
      ) : (
        <BookingTable 
          bookings={filteredBookings} 
          roomTypes={roomTypes}
          formatDate={formatDate}
          onViewClick={(b: React.SetStateAction<Booking | null>) => {
            setSelectedBooking(b);
            setIsDetailOpen(true);
          }}
          onEditClick={(b: React.SetStateAction<Booking | null>) => {
            setSelectedBooking(b);
            setPrefillParams(null);
            setIsFormOpen(true);
          }}
          onDeleteClick={(b: Booking) => handleDeleteBooking(b.bookingId, b.roomNumber)}
          onUpdateStatus={handleQuickUpdateStatus}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Form overlay Dialog Modal */}
      {isFormOpen && (
        <BookingFormModal 
          isOpen={isFormOpen}
          booking={selectedBooking}
          rooms={rooms}
          bookings={bookings}
          roomTypes={roomTypes}
          initialPrefill={prefillParams}
          onClose={() => {
            setIsFormOpen(false);
            setPrefillParams(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* Detail card View Modal overlay */}
      {isDetailOpen && selectedBooking && (
        <BookingDetailModal 
          isOpen={isDetailOpen}
          booking={selectedBooking}
          roomTypes={roomTypes}
          user={user}
          onClose={() => setIsDetailOpen(false)}
          onDelete={handleDeleteBooking}
          onEditClick={(b: React.SetStateAction<Booking | null>) => {
            setIsDetailOpen(false);
            setSelectedBooking(b);
            setPrefillParams(null);
            setIsFormOpen(true);
          }}
          formatDate={formatDate}
        />
      )}
    </div>
  );
};

export default function BookingsPage() {
  return (
    <Suspense fallback={<SkeletonTable columns={6} rows={6} />}>
      <BookingsContent />
    </Suspense>
  );
}
