"use client";

import React from "react";
import { Eye, Edit2 } from "lucide-react";
import { Booking } from "../../../types";

/**
 * Props expected by the BookingTable component.
 */
interface BookingTableProps {
  /** The list of bookings matching search and status criteria. */
  bookings: Booking[];
  /** Formats raw database date string. */
  formatDate: (dateStr: string) => string;
  /** Triggered when the details view is clicked. */
  onViewClick: (booking: Booking) => void;
  /** Triggered to launch editing modal. */
  onEditClick: (booking: Booking) => void;
  /** Current page number */
  page?: number;
  /** Total number of pages */
  totalPages?: number;
  /** Callback to change page */
  onPageChange?: (page: number) => void;
}

/**
 * Table list displaying hotel bookings with responsive card layout.
 * Supports desktop tables and mobile card grids.
 * 
 * @param props - BookingTableProps fields.
 * @returns React Component.
 */
const BookingTable: React.FC<BookingTableProps> = ({
  bookings,
  formatDate,
  onViewClick,
  onEditClick,
  page,
  totalPages,
  onPageChange
}) => {
  if (bookings.length === 0) {
    return <div className="no-data" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>No bookings match the search criteria.</div>;
  }

  return (
    <>
      {/* Desktop/Tablet Table Layout */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }} role="table" aria-label="Bookings Records List">
        <div className="table-wrapper">
          <table className="table-custom bookings-main-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer Name</th>
                <th>Phone Number</th>
                <th>Stay Dates</th>
                <th>Created By</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.bookingId} onClick={() => onViewClick(b)} style={{ cursor: "pointer" }}>
                  <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{b.bookingId}</td>
                  <td>{b.customerName}</td>
                  <td>{b.customerPhone}</td>
                  <td>
                    <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                      {formatDate(b.checkInDate)} to {formatDate(b.checkOutDate)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {b.createdByName}
                    </span>
                    <br />
                    <span className="badge" style={{ padding: "1px 4px", fontSize: "0.65rem", backgroundColor: "var(--bg-tertiary)" }}>
                      {b.createdByRole}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <span className={`badge badge-${
                        b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in" ? "success" : 
                        b.bookingStatus === "cancelled" ? "danger" : "warning"
                      }`} style={{ width: "fit-content", fontSize: "0.7rem", padding: "2px 6px" }}>
                        {b.bookingStatus}
                      </span>
                      <span className={`badge badge-${b.paymentStatus === "paid" ? "success" : b.paymentStatus === "partial" || b.paymentStatus === "partially-paid" ? "warning" : "danger"}`} style={{ width: "fit-content", fontSize: "0.65rem", padding: "1px 4px", border: "1px solid currentColor", background: "none" }}>
                        {b.paymentStatus}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "0.5rem" }} onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="btn btn-secondary btn-icon" 
                        title="View Booking Details"
                        onClick={() => onViewClick(b)}
                      >
                        <Eye size={14} />
                      </button>
                      
                      <button 
                        className="btn btn-secondary btn-icon" 
                        title="Edit Booking"
                        onClick={() => onEditClick(b)}
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List Layout */}
      <div className="bookings-mobile-cards">
        {bookings.map(b => (
          <div key={b.bookingId} className="booking-mobile-card card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div className="booking-card-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="booking-card-room" style={{ fontFamily: "monospace", fontWeight: 700 }}>{b.bookingId}</span>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <span className={`badge badge-${
                  b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in" ? "success" : 
                  b.bookingStatus === "cancelled" ? "danger" : "warning"
                }`} style={{ fontSize: "0.65rem", padding: "2px 6px" }}>
                  {b.bookingStatus}
                </span>
                <span className={`badge badge-${b.paymentStatus === "paid" ? "success" : b.paymentStatus === "partial" || b.paymentStatus === "partially-paid" ? "warning" : "danger"}`} style={{ fontSize: "0.65rem", padding: "2px 6px", border: "1px solid currentColor", background: "none" }}>
                  {b.paymentStatus}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", margin: "0.25rem 0" }}>
              <span className="booking-card-customer" style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                {b.customerName}
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {b.customerPhone}
              </span>
            </div>

            <div className="booking-card-dates" style={{ margin: "0.25rem 0", fontSize: "0.85rem" }}>
              <span>{formatDate(b.checkInDate)} to {formatDate(b.checkOutDate)}</span>
            </div>

            <div className="booking-card-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--card-border)", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>By: {b.createdByName}</span>
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "capitalize" }}>({b.createdByRole})</span>
              </div>

              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button 
                  className="btn btn-secondary btn-icon" 
                  title="View Booking Details"
                  style={{ padding: "0.4rem" }}
                  onClick={() => onViewClick(b)}
                >
                  <Eye size={13} />
                </button>
                
                <button 
                  className="btn btn-secondary btn-icon" 
                  title="Edit Booking"
                  style={{ padding: "0.4rem" }}
                  onClick={() => onEditClick(b)}
                >
                  <Edit2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {page !== undefined && totalPages !== undefined && onPageChange && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 0", marginTop: "1rem", borderTop: "1px solid var(--card-border)" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Page {page} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button 
              className="btn btn-secondary" 
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default BookingTable;
