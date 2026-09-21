"use client";

import React from "react";
import { X, Calendar, IndianRupee, ArrowDownRight, Scale, HandCoins, Wallet, Eye, CheckCircle2 } from "lucide-react";
import { Booking, Room, RoomType, Profile } from "../../../types";
import { getRoomTypeForNumber } from "../../../lib/roomUtils";

interface DayFinancialSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string; // e.g. "2026-09-08"
  displayDate: string; // e.g. "September 8, 2026"
  bookings: Booking[];
  rooms: Room[];
  roomTypes: RoomType[];
  user?: Profile | null;
  onViewBooking: (booking: Booking) => void;
  formatDate: (dateStr: string) => string;
}

const DayFinancialSheetModal: React.FC<DayFinancialSheetModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  displayDate,
  bookings,
  rooms,
  roomTypes,
  onViewBooking,
  formatDate
}) => {
  if (!isOpen) return null;

  // Filter bookings active on this date (check-in <= dateStr && check-out >= dateStr)
  const activeBookings = bookings.filter(b => {
    if (b.bookingStatus === "cancelled") return false;
    return (b.checkInDate <= dateStr && b.checkOutDate >= dateStr);
  });

  // Calculate day financial metrics
  const totalGross = activeBookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
  const totalCommission = activeBookings
    .filter(b => b.bookingSource === "agency")
    .reduce((sum, b) => sum + Number(b.agencyCommission || 0), 0);
  const netTotal = totalGross - totalCommission;
  const totalAdvance = activeBookings.reduce((sum, b) => {
    const comm = b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0;
    const net = Number(b.totalAmount || 0) - comm;
    const adv = b.paymentStatus === "paid" ? net : Number(b.advanceAmount || 0);
    return sum + adv;
  }, 0);
  const totalPending = activeBookings.reduce((sum, b) => {
    const comm = b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0;
    const net = Number(b.totalAmount || 0) - comm;
    const adv = b.paymentStatus === "paid" ? net : Number(b.advanceAmount || 0);
    return sum + (b.paymentStatus === "paid" ? 0 : Math.max(0, net - adv));
  }, 0);

  const resolveRoomType = (rNum: string, fallbackType: string) => {
    return getRoomTypeForNumber(rNum, rooms, roomTypes, fallbackType);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "confirmed":   return { backgroundColor: "var(--success-glow)", color: "var(--success)" };
      case "checked-in":  return { backgroundColor: "rgba(59,130,246,0.12)", color: "var(--primary)" };
      case "checked-out": return { backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" };
      case "cancelled":   return { backgroundColor: "var(--danger-glow)", color: "var(--danger)" };
      case "pending":     return { backgroundColor: "var(--warning-glow)", color: "var(--warning)" };
      default:            return { backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" };
    }
  };

  const payColor = (status: string) => {
    switch (status) {
      case "paid":     return { backgroundColor: "var(--success-glow)", color: "var(--success)" };
      case "partial":  return { backgroundColor: "var(--warning-glow)", color: "var(--warning)" };
      case "partially-paid": return { backgroundColor: "var(--warning-glow)", color: "var(--warning)" };
      case "unpaid":   return { backgroundColor: "var(--danger-glow)", color: "var(--danger)" };
      default:         return { backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" };
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem"
      }}
    >
      <div 
        className="card" 
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "1150px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          background: "var(--bg-primary)",
          border: "1px solid var(--card-border)"
        }}
      >
        {/* Modal Header */}
        <div 
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--card-border)",
            background: "var(--bg-secondary)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div 
              style={{
                width: 38,
                height: 38,
                borderRadius: "10px",
                background: "rgba(59, 130, 246, 0.15)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                {displayDate} — Financial Summary Sheet
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "3px 0 0 0" }}>
                Active stays and balance dues on this date
              </p>
            </div>
          </div>

          <button 
            type="button"
            className="btn btn-icon"
            onClick={onClose}
            style={{ padding: "0.5rem", borderRadius: "8px", background: "none", cursor: "pointer" }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Top Financial KPI Strip */}
          <div 
            style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", 
              gap: "0.85rem" 
            }}
          >
            {/* 1. Total Amount */}
            <div style={{ padding: "0.85rem 1rem", borderRadius: "10px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Total Booking Amount</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--primary)", marginTop: "2px" }}>
                ₹{totalGross.toLocaleString("en-IN")}
              </div>
            </div>

            {/* 2. Agency Commission */}
            <div style={{ padding: "0.85rem 1rem", borderRadius: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Agency Commission</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#ef4444", marginTop: "2px" }}>
                -₹{totalCommission.toLocaleString("en-IN")}
              </div>
            </div>

            {/* 3. Net Hotel Total */}
            <div style={{ padding: "0.85rem 1rem", borderRadius: "10px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Net Hotel Total</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#10b981", marginTop: "2px" }}>
                ₹{netTotal.toLocaleString("en-IN")}
              </div>
            </div>

            {/* 4. Advance Received */}
            <div style={{ padding: "0.85rem 1rem", borderRadius: "10px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Advance Received</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#8b5cf6", marginTop: "2px" }}>
                ₹{totalAdvance.toLocaleString("en-IN")}
              </div>
            </div>

            {/* 5. Pending Balance */}
            <div style={{ padding: "0.85rem 1rem", borderRadius: "10px", background: totalPending > 0 ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.08)", border: totalPending > 0 ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(16,185,129,0.2)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Pending Balance Due</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: totalPending > 0 ? "#f59e0b" : "#10b981", marginTop: "2px" }}>
                ₹{totalPending.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Google Sheet Style Table */}
          {activeBookings.length === 0 ? (
            <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-secondary)", background: "var(--bg-secondary)", borderRadius: "10px" }}>
              No active bookings found for {displayDate}.
            </div>
          ) : (
            <div style={{ border: "1px solid var(--card-border)", borderRadius: "10px", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table className="table-custom" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-secondary)", borderBottom: "2px solid var(--card-border)" }}>
                      <th style={{ padding: "0.7rem 0.6rem", whiteSpace: "nowrap" }}>Booking ID</th>
                      <th style={{ padding: "0.7rem 0.6rem" }}>Room(s)</th>
                      <th style={{ padding: "0.7rem 0.6rem" }}>Guest & Contact</th>
                      <th style={{ padding: "0.7rem 0.6rem", whiteSpace: "nowrap" }}>Stay Dates</th>
                      <th style={{ padding: "0.7rem 0.6rem" }}>Source / Agency</th>
                      <th style={{ padding: "0.7rem 0.6rem", textAlign: "right", color: "var(--primary)" }}>Total (₹)</th>
                      <th style={{ padding: "0.7rem 0.6rem", textAlign: "right", color: "#ef4444" }}>Agency Comm. (₹)</th>
                      <th style={{ padding: "0.7rem 0.6rem", textAlign: "right", color: "#10b981" }}>Net (₹)</th>
                      <th style={{ padding: "0.7rem 0.6rem", textAlign: "right", color: "#8b5cf6" }}>Advance (₹)</th>
                      <th style={{ padding: "0.7rem 0.6rem", textAlign: "right", color: "#f59e0b" }}>Pending Due (₹)</th>
                      <th style={{ padding: "0.7rem 0.6rem", textAlign: "center" }}>Status</th>
                      <th style={{ padding: "0.7rem 0.6rem", textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBookings.map((b, idx) => {
                      const gross = Number(b.totalAmount || 0);
                      const comm = b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0;
                      const net = gross - comm;
                      const advance = b.paymentStatus === "paid" ? net : Number(b.advanceAmount || 0);
                      const balance = b.paymentStatus === "paid" ? 0 : Math.max(0, net - advance);

                      const sc = statusColor(b.bookingStatus);
                      const pc = payColor(b.paymentStatus);
                      const roomNums = b.roomNumber ? b.roomNumber.split(",").map(r => r.trim()).filter(Boolean) : [];

                      return (
                        <tr 
                          key={b.bookingId} 
                          style={{ 
                            borderBottom: "1px solid var(--card-border)",
                            background: idx % 2 === 0 ? "transparent" : "var(--bg-secondary-subtle, rgba(255,255,255,0.02))"
                          }}
                        >
                          <td style={{ padding: "0.6rem", fontFamily: "monospace", fontWeight: 700, color: "var(--primary)", whiteSpace: "nowrap" }}>
                            {b.bookingId}
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                              {roomNums.map(rNum => (
                                <span key={rNum} className="badge" style={{ fontSize: "0.7rem", padding: "1px 5px", background: "rgba(59,130,246,0.1)", color: "var(--primary)", border: "1px solid rgba(59,130,246,0.3)" }}>
                                  Room {rNum}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <div style={{ fontWeight: 600 }}>{b.customerName}</div>
                            <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>{b.customerPhone}</div>
                          </td>
                          <td style={{ padding: "0.6rem", whiteSpace: "nowrap" }}>
                            <div style={{ fontSize: "0.78rem" }}>{formatDate(b.checkInDate)}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>to {formatDate(b.checkOutDate)}</div>
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            {b.bookingSource === "agency" ? (
                              <div>
                                <span className="badge" style={{ fontSize: "0.65rem", padding: "1px 5px", background: "rgba(168,85,247,0.12)", color: "#a855f7", textTransform: "uppercase", fontWeight: 700 }}>
                                  Agency
                                </span>
                                <div style={{ fontWeight: 600, fontSize: "0.78rem", marginTop: "2px" }}>
                                  {b.agentCompany || b.agentName || "Agency Partner"}
                                </div>
                              </div>
                            ) : (
                              <span className="badge" style={{ fontSize: "0.65rem", padding: "1px 5px", background: "var(--bg-tertiary)", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                                Direct
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                            ₹{gross.toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right", fontWeight: 600, color: comm > 0 ? "#ef4444" : "var(--text-secondary)", whiteSpace: "nowrap" }}>
                            {comm > 0 ? `-₹${comm.toLocaleString("en-IN")}` : "₹0"}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right", fontWeight: 700, color: "#10b981", whiteSpace: "nowrap" }}>
                            ₹{net.toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right", fontWeight: 600, color: "#8b5cf6", whiteSpace: "nowrap" }}>
                            ₹{advance.toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right", whiteSpace: "nowrap" }}>
                            {balance > 0 ? (
                              <span style={{ background: "rgba(245,158,11,0.15)", color: "#d97706", border: "1px solid rgba(245,158,11,0.3)", padding: "2px 6px", borderRadius: "6px", fontWeight: 800, fontSize: "0.8rem" }}>
                                ₹{balance.toLocaleString("en-IN")}
                              </span>
                            ) : (
                              <span style={{ color: "#10b981", fontSize: "0.75rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "2px" }}>
                                <CheckCircle2 size={12} /> Paid
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "center" }}>
                            <span style={{ ...sc, fontSize: "0.66rem", padding: "2px 6px", borderRadius: "99px", fontWeight: 700, textTransform: "uppercase" }}>
                              {b.bookingStatus}
                            </span>
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "center" }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: "0.3rem 0.6rem", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                              onClick={() => {
                                onClose();
                                onViewBooking(b);
                              }}
                            >
                              <Eye size={12} /> View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Google Sheet Bottom Total Row */}
                  <tfoot>
                    <tr style={{ background: "var(--bg-secondary)", borderTop: "2px solid var(--card-border)", fontWeight: 800, fontSize: "0.86rem" }}>
                      <td colSpan={5} style={{ padding: "0.75rem 0.6rem" }}>
                        TOTAL ({activeBookings.length} Bookings Staying on {displayDate})
                      </td>
                      <td style={{ padding: "0.75rem 0.6rem", textAlign: "right", color: "var(--primary)", whiteSpace: "nowrap" }}>
                        ₹{totalGross.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "0.75rem 0.6rem", textAlign: "right", color: "#ef4444", whiteSpace: "nowrap" }}>
                        -₹{totalCommission.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "0.75rem 0.6rem", textAlign: "right", color: "#10b981", whiteSpace: "nowrap" }}>
                        ₹{netTotal.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "0.75rem 0.6rem", textAlign: "right", color: "#8b5cf6", whiteSpace: "nowrap" }}>
                        ₹{totalAdvance.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "0.75rem 0.6rem", textAlign: "right", color: totalPending > 0 ? "#f59e0b" : "#10b981", whiteSpace: "nowrap" }}>
                        ₹{totalPending.toLocaleString("en-IN")}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayFinancialSheetModal;
