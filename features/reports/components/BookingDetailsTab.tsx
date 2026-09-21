"use client";

import React, { useState } from "react";
import { Search, Filter, AlertCircle, CheckCircle2 } from "lucide-react";
import { Booking, Employee, Room, RoomType } from "../../../types";
import { getRoomTypeForNumber } from "../../../lib/roomUtils";

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
  filterSource?: string;
  setFilterSource?: (source: string) => void;
  onlyPending?: boolean;
  setOnlyPending?: (val: boolean) => void;
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
  filterSource = "all",
  setFilterSource,
  onlyPending = false,
  setOnlyPending,
  isAdmin,
  formatDate,
  statusColor,
  payColor,
  onBookingClick
}) => {
  const resolveRoomType = (rNum: string, fallbackType: string) => {
    return getRoomTypeForNumber(rNum, rooms, roomTypes, fallbackType);
  };

  // Calculate table-level financial totals for the visible rows (Google Sheet SUM)
  const totals = bookings.reduce(
    (acc, b) => {
      const gross = Number(b.totalAmount || 0);
      const comm = b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0;
      const net = gross - comm;
      const advance = b.paymentStatus === "paid" ? net : Number(b.advanceAmount || 0);
      const balance = b.paymentStatus === "paid" ? 0 : Math.max(0, net - advance);

      acc.gross += gross;
      acc.commission += comm;
      acc.net += net;
      acc.advance += advance;
      acc.balance += balance;
      return acc;
    },
    { gross: 0, commission: 0, net: 0, advance: 0, balance: 0 }
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }} role="tabpanel" aria-label="Booking Details List Tab">
      {/* Filter Bar */}
      <div className="card" style={{ padding: "1rem 1.25rem", display: "flex", gap: "0.85rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            className="input-control"
            style={{ paddingLeft: "2.25rem", margin: 0 }}
            placeholder="Search by customer, agency, phone, room, ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="report-filter-dropdowns" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Quick toggle: Pending dues only */}
          {setOnlyPending && (
            <button
              type="button"
              onClick={() => setOnlyPending(!onlyPending)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.85rem",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 600,
                border: onlyPending ? "1px solid #f59e0b" : "1px solid var(--card-border)",
                background: onlyPending ? "rgba(245, 158, 11, 0.15)" : "var(--bg-secondary)",
                color: onlyPending ? "#d97706" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              <AlertCircle size={15} color={onlyPending ? "#d97706" : "currentColor"} />
              <span>
                Pending Dues Only ({bookings.filter(b => {
                  if (b.paymentStatus === "paid") return false;
                  const comm = b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0;
                  const net = Number(b.totalAmount || 0) - comm;
                  const adv = Number(b.advanceAmount || 0);
                  return (net - adv) > 0;
                }).length})
              </span>
            </button>
          )}

          {/* Source Filter */}
          {setFilterSource && (
            <select 
              className="input-control" 
              style={{ width: "auto", margin: 0, minHeight: "auto", padding: "0.45rem 0.75rem", fontSize: "0.82rem" }} 
              value={filterSource} 
              onChange={e => setFilterSource(e.target.value)}
            >
              <option value="all">All Sources</option>
              <option value="agency">Agency Only</option>
              <option value="direct">Direct Only</option>
            </select>
          )}

          {/* Status Filter */}
          <select 
            className="input-control" 
            style={{ width: "auto", margin: 0, minHeight: "auto", padding: "0.45rem 0.75rem", fontSize: "0.82rem" }} 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked-in">Checked-In</option>
            <option value="checked-out">Checked-Out</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Employee Filter */}
          {isAdmin && (
            <select 
              className="input-control" 
              style={{ width: "auto", margin: 0, minHeight: "auto", padding: "0.45rem 0.75rem", fontSize: "0.82rem" }} 
              value={filterEmployee} 
              onChange={e => setFilterEmployee(e.target.value)}
            >
              <option value="all">All Employees</option>
              {employees.map(emp => <option key={emp.uid} value={emp.uid}>{emp.fullName}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Google Sheet-style Booking Records Table */}
      {bookings.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
          No bookings match the selected filters.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--card-border)" }}>
          <div className="table-wrapper" style={{ overflowX: "auto" }}>
            <table className="table-custom" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary)", borderBottom: "2px solid var(--card-border)" }}>
                  <th style={{ padding: "0.75rem 0.6rem", whiteSpace: "nowrap" }}>Booking ID</th>
                  <th style={{ padding: "0.75rem 0.6rem", whiteSpace: "nowrap" }}>Room(s)</th>
                  <th style={{ padding: "0.75rem 0.6rem" }}>Guest Details</th>
                  <th style={{ padding: "0.75rem 0.6rem", whiteSpace: "nowrap" }}>Stay Dates</th>
                  <th style={{ padding: "0.75rem 0.6rem" }}>Source / Agency</th>
                  <th style={{ padding: "0.75rem 0.6rem", textAlign: "right", whiteSpace: "nowrap", color: "var(--primary)" }}>Total (₹)</th>
                  <th style={{ padding: "0.75rem 0.6rem", textAlign: "right", whiteSpace: "nowrap", color: "#ef4444" }}>Agency Comm. (₹)</th>
                  <th style={{ padding: "0.75rem 0.6rem", textAlign: "right", whiteSpace: "nowrap", color: "#10b981" }}>Net Total (₹)</th>
                  <th style={{ padding: "0.75rem 0.6rem", textAlign: "right", whiteSpace: "nowrap", color: "#8b5cf6" }}>Advance (₹)</th>
                  <th style={{ padding: "0.75rem 0.6rem", textAlign: "right", whiteSpace: "nowrap", color: "#f59e0b" }}>Balance Due (₹)</th>
                  <th style={{ padding: "0.75rem 0.6rem", textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, idx) => {
                  const sc = statusColor(b.bookingStatus);
                  const pc = payColor(b.paymentStatus);

                  const gross = Number(b.totalAmount || 0);
                  const comm = b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0;
                  const net = gross - comm;
                  const advance = b.paymentStatus === "paid" ? net : Number(b.advanceAmount || 0);
                  const balance = b.paymentStatus === "paid" ? 0 : Math.max(0, net - advance);

                  const roomNums = b.roomNumber ? b.roomNumber.split(",").map(r => r.trim()).filter(Boolean) : [];

                  return (
                    <tr 
                      key={b.bookingId} 
                      onClick={() => onBookingClick?.(b)}
                      style={{ 
                        cursor: onBookingClick ? "pointer" : "default",
                        background: idx % 2 === 0 ? "transparent" : "var(--bg-secondary-subtle, rgba(255,255,255,0.02))",
                        borderBottom: "1px solid var(--card-border)"
                      }}
                      className="table-row-hover"
                    >
                      {/* Booking ID */}
                      <td style={{ padding: "0.65rem 0.6rem", fontFamily: "monospace", fontWeight: 700, color: "var(--primary)", whiteSpace: "nowrap" }}>
                        {b.bookingId}
                      </td>

                      {/* Room(s) */}
                      <td style={{ padding: "0.65rem 0.6rem" }}>
                        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                          {roomNums.length > 0 ? (
                            roomNums.map(rNum => (
                              <span key={rNum} className="badge" style={{ fontSize: "0.7rem", padding: "2px 6px", backgroundColor: "rgba(59,130,246,0.1)", color: "var(--primary)", border: "1px solid rgba(59,130,246,0.3)" }}>
                                Room {rNum}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Guest Details */}
                      <td style={{ padding: "0.65rem 0.6rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{b.customerName}</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{b.customerPhone}</div>
                      </td>

                      {/* Stay Dates */}
                      <td style={{ padding: "0.65rem 0.6rem", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                          {formatDate(b.checkInDate)}
                        </span>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                          to {formatDate(b.checkOutDate)}
                        </div>
                      </td>

                      {/* Source / Agency */}
                      <td style={{ padding: "0.65rem 0.6rem" }}>
                        {b.bookingSource === "agency" ? (
                          <div>
                            <span className="badge" style={{ fontSize: "0.68rem", padding: "1px 6px", background: "rgba(168,85,247,0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.3)", textTransform: "uppercase", fontWeight: 700 }}>
                              Agency
                            </span>
                            <div style={{ fontWeight: 600, fontSize: "0.78rem", marginTop: "2px" }}>
                              {b.agentCompany || b.agentName || "Agency Partner"}
                            </div>
                            {b.agentPhone && (
                              <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>{b.agentPhone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="badge" style={{ fontSize: "0.68rem", padding: "1px 6px", background: "var(--bg-tertiary)", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                            Direct
                          </span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td style={{ padding: "0.65rem 0.6rem", textAlign: "right", fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                        ₹{gross.toLocaleString("en-IN")}
                      </td>

                      {/* Agency Commission */}
                      <td style={{ padding: "0.65rem 0.6rem", textAlign: "right", fontWeight: 600, color: comm > 0 ? "#ef4444" : "var(--text-secondary)", whiteSpace: "nowrap" }}>
                        {comm > 0 ? `-₹${comm.toLocaleString("en-IN")}` : "₹0"}
                      </td>

                      {/* Net Hotel Total */}
                      <td style={{ padding: "0.65rem 0.6rem", textAlign: "right", fontWeight: 700, color: "#10b981", whiteSpace: "nowrap" }}>
                        ₹{net.toLocaleString("en-IN")}
                      </td>

                      {/* Advance Paid */}
                      <td style={{ padding: "0.65rem 0.6rem", textAlign: "right", fontWeight: 600, color: "#8b5cf6", whiteSpace: "nowrap" }}>
                        ₹{advance.toLocaleString("en-IN")}
                      </td>

                      {/* Pending Balance */}
                      <td style={{ padding: "0.65rem 0.6rem", textAlign: "right", whiteSpace: "nowrap" }}>
                        {balance > 0 ? (
                          <span 
                            style={{ 
                              background: "rgba(245, 158, 11, 0.15)", 
                              color: "#d97706", 
                              border: "1px solid rgba(245, 158, 11, 0.3)",
                              padding: "2px 7px",
                              borderRadius: "6px",
                              fontWeight: 800,
                              fontSize: "0.82rem"
                            }}
                          >
                            ₹{balance.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span style={{ color: "#10b981", fontSize: "0.78rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "2px" }}>
                            <CheckCircle2 size={13} /> Paid
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "0.65rem 0.6rem", textAlign: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", alignItems: "center" }}>
                          <span style={{ ...sc, fontSize: "0.68rem", padding: "2px 6px", borderRadius: "99px", fontWeight: 700, textTransform: "uppercase" }}>
                            {b.bookingStatus}
                          </span>
                          <span style={{ ...pc, fontSize: "0.62rem", padding: "1px 5px", borderRadius: "99px", fontWeight: 700, textTransform: "uppercase", border: "1px solid currentColor", background: "none" }}>
                            {b.paymentStatus}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Google Sheet Total Summary Row */}
              <tfoot>
                <tr style={{ background: "var(--bg-secondary)", borderTop: "2px solid var(--card-border)", fontWeight: 800, fontSize: "0.88rem" }}>
                  <td colSpan={5} style={{ padding: "0.85rem 0.6rem", textAlign: "left" }}>
                    <span>TOTAL ({bookings.length} Visible Bookings)</span>
                  </td>
                  <td style={{ padding: "0.85rem 0.6rem", textAlign: "right", color: "var(--primary)", whiteSpace: "nowrap" }}>
                    ₹{totals.gross.toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "0.85rem 0.6rem", textAlign: "right", color: "#ef4444", whiteSpace: "nowrap" }}>
                    -₹{totals.commission.toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "0.85rem 0.6rem", textAlign: "right", color: "#10b981", whiteSpace: "nowrap" }}>
                    ₹{totals.net.toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "0.85rem 0.6rem", textAlign: "right", color: "#8b5cf6", whiteSpace: "nowrap" }}>
                    ₹{totals.advance.toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "0.85rem 0.6rem", textAlign: "right", color: totals.balance > 0 ? "#f59e0b" : "#10b981", whiteSpace: "nowrap" }}>
                    ₹{totals.balance.toLocaleString("en-IN")}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetailsTab;

