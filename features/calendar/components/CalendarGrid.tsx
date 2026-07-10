"use client";

import React from "react";
import { Room, RoomType, Booking } from "../../../types";

interface CalendarGridProps {
  rooms: Room[];
  roomTypes: RoomType[];
  monthBookings: Booking[];
  daysInMonth: number;
  year: number;
  month: number;
  monthStartDate: Date;
  monthEndDate: Date;
  isToday: (dayNum: number) => boolean;
  getDayOfWeekLabel: (dayNum: number) => string;
  isOwner: (booking: Booking) => boolean;
  onEmptyCellClick: (roomNumber: string, dayNum: number) => void;
  onBookingClick: (booking: Booking) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  rooms,
  roomTypes,
  monthBookings,
  daysInMonth,
  year,
  month,
  monthStartDate,
  monthEndDate,
  isToday,
  getDayOfWeekLabel,
  isOwner,
  onEmptyCellClick,
  onBookingClick
}) => {
  return (
    <div className="calendar-grid-wrapper">
      <div className="calendar-grid" style={{ gridTemplateColumns: `180px repeat(${daysInMonth}, 1fr)` }}>
        {/* Timeline Header Row */}
        <div className="calendar-timeline" style={{ gridColumn: `span ${daysInMonth + 1}`, gridTemplateColumns: `180px repeat(${daysInMonth}, 1fr)`, display: "grid" }}>
          <div style={{ 
            padding: "0.75rem", 
            fontWeight: 600, 
            fontSize: "0.8rem", 
            backgroundColor: "var(--bg-secondary)", 
            borderRight: "1px solid var(--card-border)", 
            position: "sticky", 
            left: 0, 
            zIndex: 60 
          }}>
            Room / Timeline
          </div>
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1;
            const isDayToday = isToday(day);
            return (
              <div key={day} className={`timeline-cell ${isDayToday ? "today" : ""}`}>
                <div style={{ fontWeight: 600 }}>{day}</div>
                <div style={{ fontSize: "0.6rem", textTransform: "uppercase" }}>{getDayOfWeekLabel(day)}</div>
              </div>
            );
          })}
        </div>

        {/* Room Grid Rows */}
        {rooms.map(room => {
          const roomTypeLabel = roomTypes.find(rt => rt.id === room.roomType)?.name || room.roomType;
          return (
            <div key={room.roomNumber} className="room-row" style={{ gridColumn: `span ${daysInMonth + 1}`, gridTemplateColumns: `180px repeat(${daysInMonth}, 1fr)`, display: "grid" }}>
              <div className="room-cell">
                <span className="room-number">Room {room.roomNumber}</span>
                <span className="room-type">{roomTypeLabel}</span>
              </div>

              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const isColToday = isToday(day);
                const d = new Date(year, month, day);
                const cellDateStr = d.toISOString().split("T")[0];

                // Find booking that intersects this specific day for this specific room
                const activeBooking = monthBookings.find(b => {
                  const bookedRoomNumbers = b.roomNumber ? b.roomNumber.split(",").map(r => r.trim()) : [];
                  if (!bookedRoomNumbers.includes(room.roomNumber)) return false;
                  return (b.checkInDate <= cellDateStr && b.checkOutDate > cellDateStr);
                });

                if (activeBooking) {
                  const checkInDateObj = new Date(activeBooking.checkInDate);
                  const isStart = activeBooking.checkInDate === cellDateStr || (day === 1 && checkInDateObj < monthStartDate);

                  if (isStart) {
                    const checkOutDateObj = new Date(activeBooking.checkOutDate);
                    
                    const blockStartDay = checkInDateObj < monthStartDate ? 1 : checkInDateObj.getDate();
                    const blockEndDay = checkOutDateObj > monthEndDate ? daysInMonth + 1 : checkOutDateObj.getDate();
                    const colSpan = Math.max(1, blockEndDay - blockStartDay);

                    const bookingMasked = !isOwner(activeBooking);
                    const customerLabel = bookingMasked ? "[Restricted]" : activeBooking.customerName;

                    let statusClass = "booking-status-confirmed";
                    if (activeBooking.bookingStatus === "pending") statusClass = "booking-status-pending";
                    else if (activeBooking.bookingStatus === "checked-in") statusClass = "booking-status-checked-in";
                    else if (activeBooking.bookingStatus === "checked-out") statusClass = "booking-status-checked-out";
                    else if (activeBooking.bookingStatus === "cancelled") statusClass = "booking-status-cancelled";

                    return (
                      <div 
                        key={day} 
                        className={`booking-block ${statusClass} ${bookingMasked ? "booking-masked" : ""}`}
                        style={{ 
                          gridColumn: `span ${colSpan}`,
                          zIndex: 10
                        }}
                        onClick={() => onBookingClick(activeBooking)}
                      >
                        <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {activeBooking.bookingId} - {customerLabel}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }

                return (
                  <div 
                    key={day} 
                    className={`grid-day-cell ${isColToday ? "today-column" : ""}`}
                    onClick={() => onEmptyCellClick(room.roomNumber, day)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
