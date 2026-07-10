"use client";

import React from "react";
import { X } from "lucide-react";
import { Employee, Booking } from "../../../types";

interface EmployeeActivityModalProps {
  isOpen: boolean;
  employee: Employee | null;
  bookings: Booking[];
  formatDate: (dateStr: string) => string;
  onClose: () => void;
}

const EmployeeActivityModal: React.FC<EmployeeActivityModalProps> = ({
  isOpen,
  employee,
  bookings,
  formatDate,
  onClose
}) => {
  if (!isOpen || !employee) return null;

  // Filter bookings created by this employee
  const employeeBookings = bookings.filter(b => b.createdByUid === employee.uid);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Activity Summary: ${employee.fullName}`}>
      <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span>Activity Log: {employee.fullName}</span>
            <span className="badge" style={{ backgroundColor: "var(--bg-tertiary)", fontSize: "0.75rem" }}>
              {employee.role}
            </span>
          </h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose} aria-label="Close modal dialog">
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--primary)" }}>Profile Specifications</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.85rem", backgroundColor: "var(--bg-secondary)", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--card-border)" }}>
              <div><span style={{ color: "var(--text-muted)" }}>Email:</span> {employee.email}</div>
              <div><span style={{ color: "var(--text-muted)" }}>Phone:</span> {employee.phone}</div>
              <div><span style={{ color: "var(--text-muted)" }}>Status:</span> {employee.status.toUpperCase()}</div>
              <div><span style={{ color: "var(--text-muted)" }}>Joined:</span> {formatDate(employee.joinedDate)}</div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              Reservations Logged ({employeeBookings.length})
            </h3>
            
            {employeeBookings.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", backgroundColor: "var(--bg-primary)", borderRadius: "var(--radius-sm)", border: "1px dashed var(--card-border)" }}>
                No reservation activities recorded for this employee.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {employeeBookings.map(b => (
                  <div key={b.bookingId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--card-border)", fontSize: "0.85rem" }}>
                    <div>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)", marginRight: "0.5rem" }}>{b.bookingId}</span>
                      <span style={{ fontWeight: 600 }}>{b.customerName}</span>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                        Stay: {formatDate(b.checkInDate)} to {formatDate(b.checkOutDate)} (Room {b.roomNumber})
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      <span className={`badge badge-${b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in" ? "success" : b.bookingStatus === "cancelled" ? "danger" : "warning"}`} style={{ fontSize: "0.65rem", padding: "1px 6px" }}>
                        {b.bookingStatus}
                      </span>
                      <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>₹{b.totalAmount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeActivityModal;
