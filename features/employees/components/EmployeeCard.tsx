"use client";

import React from "react";
import { Mail, Phone, Calendar, BookOpen, Edit2, UserX, UserCheck, Trash2 } from "lucide-react";
import { Employee } from "../../../types";
import { formatDate } from "../../../lib/db";

interface EmployeeCardProps {
  employee: Employee;
  bookingsCount: number;
  user: any;
  onEditClick: (emp: Employee) => void;
  onToggleStatus: (employeeId: string, uid: string, status: "active" | "inactive") => Promise<void>;
  onDelete: (employeeId: string, uid: string) => Promise<void>;
  onActivityClick: (emp: Employee) => void;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  bookingsCount,
  user,
  onEditClick,
  onToggleStatus,
  onDelete,
  onActivityClick
}) => {
  const initials = employee.fullName
    ? employee.fullName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
    : "U";

  const handleStatusToggle = async () => {
    const nextStatus = employee.status === "active" ? "inactive" : "active";
    if (window.confirm(`Are you sure you want to set employee status to ${nextStatus}?`)) {
      await onToggleStatus(employee.employeeId, employee.uid, nextStatus);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to permanently delete employee ${employee.fullName}?`)) {
      await onDelete(employee.employeeId, employee.uid);
    }
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }} role="article" aria-label={`Employee profile card: ${employee.fullName}`}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div className="user-avatar" style={{ width: "48px", height: "48px", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, borderRadius: "50%", background: "var(--primary-glow)", color: "var(--primary)" }} aria-hidden="true">
          {initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {employee.fullName}
          </h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ID: {employee.employeeId}</span>
        </div>
        <span className={`badge badge-${employee.status === "active" ? "success" : "danger"}`} style={{ textTransform: "uppercase", fontSize: "0.7rem", padding: "2px 8px" }}>
          {employee.status}
        </span>
      </div>

      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.4rem", borderTop: "1px solid var(--card-border)", paddingTop: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Mail size={14} className="text-primary" />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{employee.email}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Phone size={14} className="text-primary" />
          <span>{employee.phone}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Calendar size={14} className="text-primary" />
          <span>Joined: {formatDate(employee.joinedDate)}</span>
        </div>
      </div>

      {employee.notes && (
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", backgroundColor: "var(--bg-primary)", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--card-border)" }}>
          "{employee.notes}"
        </p>
      )}

      <div style={{ borderTop: "1px solid var(--card-border)", paddingTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>
          Bookings created: <strong className="text-primary">{bookingsCount}</strong>
        </span>
        
        <span className="badge" style={{ backgroundColor: "var(--bg-tertiary)", textTransform: "capitalize", fontSize: "0.7rem", padding: "2px 8px" }}>
          {employee.role}
        </span>
      </div>

      {/* Actions Panel */}
      {user?.role === "admin" && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button 
            className="btn btn-secondary btn-icon-label" 
            style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}
            onClick={() => onActivityClick(employee)}
          >
            <BookOpen size={14} /> Activity
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ padding: "0.5rem" }}
            onClick={() => onEditClick(employee)}
            title="Edit Details"
          >
            <Edit2 size={14} />
          </button>
          <button 
            className={`btn ${employee.status === "active" ? "btn-danger" : "btn-primary"}`} 
            style={{ padding: "0.5rem", width: "36px", height: "36px", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={handleStatusToggle}
            title={employee.status === "active" ? "Deactivate Account" : "Activate Account"}
          >
            {employee.status === "active" ? <UserX size={14} /> : <UserCheck size={14} />}
          </button>
          {employee.role !== "admin" && (
            <button 
              className="btn btn-danger" 
              style={{ padding: "0.5rem", width: "36px", height: "36px", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center" }}
              onClick={handleDelete}
              title="Delete Employee"
            >
              <Trash2 size={14} style={{ color: "white" }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeCard;
