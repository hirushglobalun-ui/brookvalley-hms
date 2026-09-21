"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useAuth } from "../../../lib/auth";
import { 
  BookingsService,
  BookingDetailModal,
  BookingFormModal
} from "../../../features/bookings";
import { SettingsService } from "../../../features/settings";
import { CalendarGrid, DayFinancialSheetModal } from "../../../features/calendar";
import { formatDate } from "../../../lib/db";
import { ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import { Booking, Room, RoomType } from "../../../types";
import { Skeleton } from "../../../components/ui/Skeleton";

const bookingsService = new BookingsService();
const settingsService = new SettingsService();

/**
 * Visual occupancy timeline calendar page.
 * Manages calendar calculations and acts as a controller for extracted widgets.
 */
const CalendarViewContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  // Selected date context
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Data States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefillParams, setPrefillParams] = useState<{ checkInDate?: string; checkOutDate?: string; roomNumber?: string } | null>(null);
  const [selectedDayForSheet, setSelectedDayForSheet] = useState<number | null>(null);
  const [isDaySheetOpen, setIsDaySheetOpen] = useState(false);

  // Load initial dataset
  const initialLoad = async () => {
    try {
      setLoading(true);
      const [bList, rList, rtList] = await Promise.all([
        bookingsService.getBookings(),
        settingsService.getRooms(),
        settingsService.getRoomTypes()
      ]);
      setBookings(bList.data);
      setRooms(rList);
      setRoomTypes(rtList);
    } catch (err) {
      console.error("Failed to load calendar datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      initialLoad();
    }
  }, [authLoading, user?.uid, user?.id, user?.role]);

  const refreshData = async () => {
    try {
      const [bList, rList, rtList] = await Promise.all([
        bookingsService.getBookings(),
        settingsService.getRooms(),
        settingsService.getRoomTypes()
      ]);
      setBookings(bList.data);
      setRooms(rList);
      setRoomTypes(rtList);
    } catch (err) {
      console.error(err);
    }
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStartDate = new Date(year, month, 1);
  const monthEndDate = new Date(year, month, daysInMonth, 23, 59, 59);

  // Filter bookings that overlap with this month
  const monthBookings = bookings.filter(b => {
    const bStart = new Date(b.checkInDate);
    const bEnd = new Date(b.checkOutDate);
    return (bStart <= monthEndDate && bEnd >= monthStartDate);
  });

  // Verify if a specific day represents today
  const isToday = (dayNum: number): boolean => {
    const today = new Date();
    return (
      today.getDate() === dayNum &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  const getDayOfWeekLabel = (dayNum: number): string => {
    const d = new Date(year, month, dayNum);
    return d.toLocaleString("default", { weekday: "short" }).substring(0, 2);
  };

  // Booking access logic (all authenticated staff members can view booking statuses and details)
  const isOwner = (booking: Booking): boolean => {
    if (user) return true;
    const currentUid = user?.uid || user?.id;
    if (!currentUid || !booking.createdByUid) return false;
    return booking.createdByUid === currentUid;
  };

  // Redirect to new booking screen with pre-filled inputs when clicking empty cells
  const handleEmptyCellClick = (roomNumber: string, dayNum: number) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const checkInStr = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
    
    const checkoutDate = new Date(year, month, dayNum + 1);
    const checkOutStr = `${checkoutDate.getFullYear()}-${pad(checkoutDate.getMonth() + 1)}-${pad(checkoutDate.getDate())}`;

    setPrefillParams({
      checkInDate: checkInStr,
      checkOutDate: checkOutStr,
      roomNumber: roomNumber
    });
    setSelectedBooking(null);
    setIsModalOpen(true);
  };

  // Delete booking handler
  const handleDeleteBooking = async (bId: string, rNum: string) => {
    if (!window.confirm(`Are you sure you want to delete booking ${bId}?`)) return;
    const reason = window.prompt("Please specify a reason for soft-deleting this booking:");
    if (reason === null) return; // User cancelled prompt

    await bookingsService.deleteBooking(bId, rNum, user, reason.trim() || "Accidental entry / Admin cleanup");
    refreshData();
  };

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Upper header section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Occupancy Calendar</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Visual stays timeline. Drag or click cells to prefill reservations.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Day Financial Sheet Shortcut Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const today = new Date();
              const dayToUse = (today.getFullYear() === year && today.getMonth() === month) ? today.getDate() : 1;
              setSelectedDayForSheet(dayToUse);
              setIsDaySheetOpen(true);
            }}
            style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.85rem", fontWeight: 600, padding: "0.5rem 0.85rem", borderRadius: "8px" }}
            title="Open Google Sheet-style summary for a day"
          >
            <FileSpreadsheet size={16} color="var(--primary)" />
            <span>Day Financial Sheet</span>
          </button>

          {/* Month Selector widget */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--bg-secondary)", border: "1px solid var(--card-border)", borderRadius: "8px", padding: "0.25rem" }}>
            <button className="btn btn-icon" style={{ padding: "0.4rem", background: "none" }} onClick={handlePrevMonth}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ minWidth: 140, textAlign: "center", fontWeight: 700, fontSize: "0.9rem" }}>
              {monthName} {year}
            </span>
            <button className="btn btn-icon" style={{ padding: "0.4rem", background: "none" }} onClick={handleNextMonth}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid container */}
      {loading ? (
        <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Skeleton width={180} height={24} />
            <Skeleton width={140} height={32} borderRadius={8} />
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <Skeleton width={100} height={36} borderRadius={8} />
              <div style={{ flex: 1, display: "flex", gap: "0.5rem" }}>
                {Array.from({ length: 10 }).map((_, j) => (
                  <Skeleton key={j} style={{ flex: 1 }} height={36} borderRadius={6} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <CalendarGrid
          rooms={rooms}
          roomTypes={roomTypes}
          monthBookings={monthBookings}
          daysInMonth={daysInMonth}
          year={year}
          month={month}
          monthStartDate={monthStartDate}
          monthEndDate={monthEndDate}
          isToday={isToday}
          getDayOfWeekLabel={getDayOfWeekLabel}
          isOwner={isOwner}
          onEmptyCellClick={handleEmptyCellClick}
          onBookingClick={(b) => {
            setSelectedBooking(b);
            setIsDetailOpen(true);
          }}
          onDayClick={(dayNum) => {
            setSelectedDayForSheet(dayNum);
            setIsDaySheetOpen(true);
          }}
        />
      )}

      {/* Form overlay Dialog Modal */}
      {isModalOpen && (
        <BookingFormModal 
          isOpen={isModalOpen}
          booking={selectedBooking}
          rooms={rooms}
          bookings={bookings}
          roomTypes={roomTypes}
          initialPrefill={prefillParams}
          onClose={() => {
            setIsModalOpen(false);
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
          rooms={rooms}
          roomTypes={roomTypes}
          user={user}
          onClose={() => setIsDetailOpen(false)}
          onDelete={handleDeleteBooking}
          onEditClick={(b: React.SetStateAction<Booking | null>) => {
            setIsDetailOpen(false);
            setSelectedBooking(b);
            setPrefillParams(null);
            setIsModalOpen(true);
          }}
          formatDate={formatDate}
        />
      )}

      {/* Day Financial Sheet Modal overlay */}
      {isDaySheetOpen && selectedDayForSheet !== null && (
        <DayFinancialSheetModal
          isOpen={isDaySheetOpen}
          dateStr={`${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDayForSheet).padStart(2, "0")}`}
          displayDate={`${monthName} ${selectedDayForSheet}, ${year}`}
          bookings={bookings}
          rooms={rooms}
          roomTypes={roomTypes}
          user={user}
          onClose={() => {
            setIsDaySheetOpen(false);
            setSelectedDayForSheet(null);
          }}
          onViewBooking={(b) => {
            setSelectedBooking(b);
            setIsDetailOpen(true);
          }}
          formatDate={formatDate}
        />
      )}
    </div>
  );
};

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Skeleton width={180} height={24} />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={36} borderRadius={8} />
        ))}
      </div>
    }>
      <CalendarViewContent />
    </Suspense>
  );
}
