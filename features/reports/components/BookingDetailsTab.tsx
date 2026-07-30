"use client";

import React from "react";
import { Search } from "lucide-react";
import { Booking, Employee, Room, RoomType } from "../../../types";

interface BookingDetailsTabProps {
  bookings: Booking[];
  employees: Employee[];
  rooms?: Room[];
  roomTypes?: RoomType[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  filterEmployee: string;
  setFilterEmployee: (empId: string) => void;
  isAdmin: boolean;
  formatDate: (dateStr: string) => string;
  statusColor: (status: string) => { backgroundColor: string; color: string };
  payColor: (status: string) => { backgroundColor: string; color: string };
  onBookingClick?: (booking: Booking) => void;
}

const BookingDetailsTab: React.FC<BookingDetailsTabProps> = ({
  bookings,
  employees,
  rooms,
  roomTypes,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  filterEmployee,
  setFilterEmployee,
  isAdmin,
  formatDate,
  statusColor,
  payColor,
  onBookingClick
}) => {
  const getRoomTypeForNumber = (rNum: string, fallbackType: string) => {
    const cleanRNum = rNum.replace(/[^0-9]/g, "").trim();
    const roomObj = rooms?.find(r => {
      const dbNum = r.roomNumber.replace(/[^0-9]/g, "").trim();
      return r.roomNumber === rNum || r.roomNumber === cleanRNum || dbNum === cleanRNum || (dbNum.replace(/^0+/, "") === cleanRNum.replace(/^0+/, "") && cleanRNum.length > 0);
    });
    const rtObj = roomTypes?.find(rt => rt.id === roomObj?.roomType) || roomTypes?.find(rt => rt.id === fallbackType);
    return rtObj?.name || fallbackType;
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }} role="tabpanel" aria-label="Booking Details List Tab">
      {/* Filter Bar */}
      <div className="card" style={{ padding: "1rem 1.25rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            className="input-control"
            style={{ paddingLeft: "2.25rem", margin: 0 }}
            placeholder="Search by name, phone, booking ID, room..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="report-filter-dropdowns">
          <select className="input-control" style={{ width: "auto", margin: 0 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked-in">Checked-In</option>
            <option value="checked-out">Checked-Out</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {isAdmin && (
            <select className="input-control" style={{ width: "auto", margin: 0 }} value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
              <option value="all">All Employees</option>
              {employees.map(emp => <option key={emp.uid} value={emp.uid}>{emp.fullName}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Booking Records Table */}
      {bookings.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>No bookings found.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrapper">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Property/Room Type</th>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>Stay Dates</th>
                  <th>Source</th>
                  <th>Created By</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const sc = statusColor(b.bookingStatus);
                  const pc = payColor(b.paymentStatus);
                  return (
                    <tr 
                      key={b.bookingId} 
                      onClick={() => onBookingClick?.(b)}
                      style={{ cursor: onBookingClick ? "pointer" : "default" }}
                    >
                      <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)" }}>{b.bookingId}</td>
                      <td style={{ textTransform: "capitalize" }}>
                        {(() => {
                          const roomNums = b.roomNumber ? b.roomNumber.split(",").map(r => r.trim()).filter(Boolean) : [];
                          const uniqueTypes = Array.from(new Set(
                            roomNums.length > 0 
                              ? roomNums.map(rNum => getRoomTypeForNumber(rNum, b.roomType))
                              : [(roomTypes?.find(rt => rt.id === b.roomType)?.name || b.roomType)]
                          )).join(", ");

                          return (
                            <>
                              <span style={{ fontWeight: 600 }}>{uniqueTypes}</span>
                              <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginTop: "3px" }}>
                                {roomNums.map(rNum => {
                                  const typeName = getRoomTypeForNumber(rNum, b.roomType);
                                  return (
                                    <span key={rNum} className="badge" style={{ fontSize: "0.65rem", padding: "1px 5px", backgroundColor: "rgba(59,130,246,0.1)", color: "var(--primary)", border: "1px solid var(--primary)" }}>
                                      Room {rNum} ({typeName})
                                    </span>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{b.customerName}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{b.customerPhone}</td>
                      <td>
                        <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                          {formatDate(b.checkInDate)} to {formatDate(b.checkOutDate)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.85rem", textTransform: "capitalize", fontWeight: 600 }}>
                          {b.bookingSource || "Direct"}
                        </span>
                        {b.bookingSource === 'agency' && (
                          <div style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "2px" }}>
                            ₹{b.agencyCommission || 0}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          {b.createdByName}
                        </span>
                        <br />
                        <span className="badge" style={{ padding: "1px 4px", fontSize: "0.65rem", backgroundColor: "var(--bg-tertiary)", textTransform: "uppercase" }}>
                          {b.createdByRole}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <span style={{ ...sc, width: "fit-content", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "99px", fontWeight: 700, textTransform: "uppercase" }}>
                            {b.bookingStatus}
                          </span>
                          <span style={{ ...pc, width: "fit-content", fontSize: "0.65rem", padding: "1px 6px", borderRadius: "99px", fontWeight: 700, textTransform: "uppercase", border: "1px solid currentColor", background: "none" }}>
                            {b.paymentStatus}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetailsTab;
