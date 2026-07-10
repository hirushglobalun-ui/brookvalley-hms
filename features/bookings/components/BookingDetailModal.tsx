"use client";

import React from "react";
import { X, Edit2, Trash2 } from "lucide-react";
import { Booking, RoomType } from "../../../types";

interface BookingDetailModalProps {
  isOpen: boolean;
  booking: Booking | null;
  roomTypes: RoomType[];
  user: any;
  onClose: () => void;
  onDelete: (bookingId: string, roomNumber: string) => Promise<void>;
  onEditClick: (booking: Booking) => void;
  formatDate: (dateStr: string) => string;
}

const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  isOpen,
  booking,
  roomTypes,
  user,
  onClose,
  onDelete,
  onEditClick,
  formatDate
}) => {
  if (!isOpen || !booking) return null;

  const isOwner = (b: Booking): boolean => {
    if (user?.role === "admin") return true;
    return b.createdByUid === user?.uid;
  };

  const mask = (val: string | number | undefined | null, b: Booking, fallback = "••••••••") => {
    if (!val) return "";
    if (isOwner(b)) return String(val);
    return fallback;
  };

  const roomTypeLabel = roomTypes.find(rt => rt.id === booking.roomType)?.name || booking.roomType;

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete booking ${booking.bookingId}?`)) {
      await onDelete(booking.bookingId, booking.roomNumber);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Detail View: Booking ${booking.bookingId}`}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span>Booking Record</span>
            <span className="badge" style={{ backgroundColor: "var(--bg-tertiary)", fontSize: "0.75rem" }}>
              {booking.bookingId}
            </span>
          </h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose} aria-label="Close modal dialog">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body info-detail-grid">
          {/* Customer Details section */}
          <div className="info-detail-full" style={{ borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.75rem", marginBottom: "0.5rem" }}>
            <h3 style={{ fontSize: "0.85rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Customer Profile
            </h3>
          </div>

          <div className="info-detail-item">
            <span className="info-detail-label">Name</span>
            <span className="info-detail-value">{mask(booking.customerName, booking)}</span>
          </div>

          <div className="info-detail-item">
            <span className="info-detail-label">Phone</span>
            <span className="info-detail-value">{mask(booking.customerPhone, booking)}</span>
          </div>

          <div className="info-detail-item">
            <span className="info-detail-label">Email</span>
            <span className="info-detail-value">{mask(booking.customerEmail, booking, "[Restricted]") || "—"}</span>
          </div>

          <div className="info-detail-item">
            <span className="info-detail-label">Address</span>
            <span className="info-detail-value">{mask(booking.customerAddress, booking, "[Restricted]") || "—"}</span>
          </div>

          {/* Stay / Room Details Section */}
          <div className="info-detail-full" style={{ borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.75rem", marginTop: "1rem", marginBottom: "0.5rem" }}>
            <h3 style={{ fontSize: "0.85rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Room & Dates
            </h3>
          </div>

          <div className="info-detail-item">
            <span className="info-detail-label">Room Number</span>
            <span className="info-detail-value">Room {booking.roomNumber}</span>
          </div>

          <div className="info-detail-item">
            <span className="info-detail-label">Room Type</span>
            <span className="info-detail-value" style={{ textTransform: "capitalize" }}>
              {roomTypeLabel}
            </span>
          </div>

          <div className="info-detail-item">
            <span className="info-detail-label">Check-in</span>
            <span className="info-detail-value">{formatDate(booking.checkInDate)}</span>
          </div>

          <div className="info-detail-item">
            <span className="info-detail-label">Check-out</span>
            <span className="info-detail-value">{formatDate(booking.checkOutDate)}</span>
          </div>

          <div className="info-detail-item">
            <span className="info-detail-label">Guests Count</span>
            <span className="info-detail-value">{booking.guestCount || 1} Guests</span>
          </div>

          <div className="info-detail-item">
            <span className="info-detail-label">Total Charged</span>
            <span className="info-detail-value">
              {isOwner(booking) ? `₹${booking.totalAmount}` : "[Restricted]"}
            </span>
          </div>

          {/* Status Section */}
          <div className="info-detail-full" style={{ borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.75rem", marginTop: "1rem", marginBottom: "0.5rem" }}>
            <h3 style={{ fontSize: "0.85rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Status & Payments
            </h3>
          </div>

          <div className="info-detail-item">
            <span className="info-detail-label">Booking Status</span>
            <span className="info-detail-value">
              <span className={`badge badge-${
                booking.bookingStatus === "confirmed" || booking.bookingStatus === "checked-in" ? "success" : 
                booking.bookingStatus === "cancelled" ? "danger" : "warning"
              }`} style={{ textTransform: "uppercase", fontSize: "0.7rem", padding: "2px 8px" }}>
                {booking.bookingStatus}
              </span>
            </span>
          </div>

          <div className="info-detail-item">
            <span className="info-detail-label">Payment status</span>
            <span className="info-detail-value" style={{ textTransform: "uppercase", fontSize: "0.8rem" }}>
              {booking.paymentStatus}
            </span>
          </div>

          <div className="info-detail-item">
            <span className="info-detail-label">Payment Method</span>
            <span className="info-detail-value" style={{ textTransform: "capitalize" }}>
              {booking.paymentMethod || "None"}
            </span>
          </div>

          <div className="info-detail-item">
            <span className="info-detail-label">Advance Paid</span>
            <span className="info-detail-value">
              ₹{booking.advanceAmount || 0}
            </span>
          </div>

          <div className="info-detail-item">
            <span className="info-detail-label">Balance Due</span>
            <span className="info-detail-value" style={{ fontWeight: 700, color: "var(--danger)" }}>
              {isOwner(booking) ? `₹${Number(booking.totalAmount || 0) - Number(booking.advanceAmount || 0)}` : "[Restricted]"}
            </span>
          </div>

          {booking.paymentProof && (
            <div className="info-detail-full" style={{ marginTop: "0.75rem", borderTop: "1px dashed var(--card-border)", paddingTop: "0.75rem" }}>
              <span className="info-detail-label" style={{ display: "block", marginBottom: "0.5rem" }}>Payment Proof Attachment</span>
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
                <img 
                  src={booking.paymentProof} 
                  alt="Payment Proof" 
                  style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: "4px", border: "1px solid var(--card-border)", boxShadow: "var(--shadow-sm)" }} 
                />
                <a 
                  href={booking.paymentProof} 
                  download={`payment_proof_${booking.bookingId}`} 
                  className="btn btn-secondary" 
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", height: "fit-content", display: "inline-flex", alignItems: "center" }}
                >
                  Download Proof
                </a>
              </div>
            </div>
          )}

          <div className="info-detail-item">
            <span className="info-detail-label">Registered By</span>
            <span className="info-detail-value">
              {booking.createdByName} ({booking.createdByRole})
            </span>
          </div>

          <div className="info-detail-full">
            <span className="info-detail-label">Internal Remarks</span>
            <span className="info-detail-value" style={{ fontWeight: "normal", fontSize: "0.85rem", fontStyle: "italic", whiteSpace: "pre-line" }}>
              {mask(booking.remarks, booking, "[Restricted]") || "No remarks entered."}
            </span>
          </div>
        </div>

        <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div>
            {isOwner(booking) && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-secondary btn-icon" onClick={() => onEditClick(booking)}>
                  <Edit2 size={14} /> Edit
                </button>
                <button className="btn btn-danger btn-icon" onClick={handleDelete}>
                  <Trash2 size={14} style={{ color: "white" }} /> Delete
                </button>
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={onClose}>
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailModal;
