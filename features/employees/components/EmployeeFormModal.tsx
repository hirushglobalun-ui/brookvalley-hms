"use client";

import React, { useState, useEffect } from "react";
import { X, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Employee } from "../../../types";

interface EmployeeFormModalProps {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
  onSubmit: (data: any, password?: string) => Promise<void>;
}

const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  employee,
  onClose,
  onSubmit
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("employee");
  const [status, setStatus] = useState("active");
  const [joinedDate, setJoinedDate] = useState("");
  const [notes, setNotes] = useState("");
  
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Sync Form States
  useEffect(() => {
    if (!isOpen) return;

    if (employee) {
      setFullName(employee.fullName);
      setEmail(employee.email);
      setPassword("");
      setShowPassword(false);
      setPhone(employee.phone || "");
      setRole(employee.role);
      setStatus(employee.status);
      setJoinedDate(employee.joinedDate);
      setNotes(employee.notes || "");
      setFormError("");
    } else {
      setFullName("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setPhone("");
      setRole("employee");
      setStatus("active");
      setJoinedDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setFormError("");
    }
  }, [isOpen, employee]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (cleanPhone.length !== 10) {
      setFormError("Phone number must be exactly 10 digits.");
      return;
    }

    setFormLoading(true);

    try {
      if (employee) {
        const payload = {
          fullName,
          phone: cleanPhone,
          role,
          notes
        };
        await onSubmit(payload);
      } else {
        if (!password || password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        const payload = {
          fullName,
          email,
          phone: cleanPhone,
          role,
          status,
          joinedDate,
          notes
        };
        await onSubmit(payload, password);
      }
      onClose();
    } catch (err: any) {
      setFormError(err.message || "Failed to save employee.");
    } finally {
      setFormLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={employee ? "Edit Employee Details" : "Add Employee Account"}>
      <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>
            {employee ? `Edit Employee Details` : "Add Employee Account"}
          </h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose} aria-label="Close modal dialog">
            <X size={16} />
          </button>
        </div>
        
        <form onSubmit={handleFormSubmit} className="modal-body" autoComplete="off">
          {formError && (
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.5rem", 
              backgroundColor: "var(--danger-glow)", 
              color: "var(--danger)",
              padding: "0.75rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              marginBottom: "1rem"
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{formError}</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }} className="mobile-stacked-grid">
            <div className="form-group">
              <label>Full Name *</label>
              <input 
                type="text" 
                className="input-control" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Login Email Address *</label>
              <input 
                type="email" 
                className="input-control" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!employee}
                required
                autoComplete="off"
              />
            </div>

            <div className="form-group" style={{ gridColumn: employee ? "span 2" : "span 1" }}>
              <label>Phone Number * (10 Digits)</label>
              <input 
                type="tel" 
                className="input-control" 
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").substring(0, 10))}
                placeholder="e.g. 9876543210"
                required
              />
            </div>

            {!employee && (
              <div className="form-group">
                <label>Assign Password * (Min 6 chars)</label>
                <div style={{ position: "relative" }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="input-control" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    style={{ paddingRight: "2.5rem" }}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Access Privilege Role</label>
              <select 
                className="input-control" 
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="employee">Staff Employee</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>

            <div className="form-group">
              <label>Activation Status</label>
              <select 
                className="input-control" 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={employee?.role === "admin"}
              >
                <option value="active">Active (Access Granted)</option>
                <option value="inactive">Inactive (Access Suspended)</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label>Employment Joined Date</label>
              <input 
                type="date" 
                className="input-control" 
                value={joinedDate}
                onChange={(e) => setJoinedDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Internal Administrator Remarks</label>
            <textarea 
              className="input-control" 
              rows={3} 
              placeholder="Employment history or general records..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={formLoading}>
              {formLoading ? "Saving..." : "Save Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeFormModal;
