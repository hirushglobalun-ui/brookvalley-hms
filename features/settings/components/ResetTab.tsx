"use client";

import React, { useState } from "react";
import { Trash2, AlertCircle } from "lucide-react";

interface ResetTabProps {
  user: any;
  onClearBookings: () => Promise<void>;
  onClearEmployees: () => Promise<void>;
  onClearRoomTypes: () => Promise<void>;
}

const ResetTab: React.FC<ResetTabProps> = ({
  user,
  onClearBookings,
  onClearEmployees,
  onClearRoomTypes
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  if (user?.role !== "admin") return null;

  const handleClearBookings = async () => {
    if (!window.confirm("WARNING: Are you sure you want to clear ALL booking records? This action cannot be undone.")) return;
    if (!window.confirm("DOUBLE CONFIRMATION: Are you absolutely certain you want to wipe the bookings collection?")) return;
    setActionLoading("bookings");
    try {
      await onClearBookings();
      alert("All bookings cleared successfully!");
    } catch (err: any) {
      alert("Failed to clear bookings: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearEmployees = async () => {
    if (!window.confirm("WARNING: Are you sure you want to delete ALL employee records? This action cannot be undone.")) return;
    if (!window.confirm("DOUBLE CONFIRMATION: Are you absolutely certain you want to wipe the employees list (excluding yourself)?")) return;
    setActionLoading("employees");
    try {
      await onClearEmployees();
      alert("All employees cleared successfully!");
    } catch (err: any) {
      alert("Failed to clear employees: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearRoomTypes = async () => {
    if (!window.confirm("WARNING: Are you sure you want to delete ALL room types and rooms? This action cannot be undone.")) return;
    if (!window.confirm("DOUBLE CONFIRMATION: Are you absolutely certain? This will wipe the rooms configurations and you will need to re-add them.")) return;
    setActionLoading("types");
    try {
      await onClearRoomTypes();
      alert("All room types and rooms cleared successfully!");
    } catch (err: any) {
      alert("Failed to clear room types: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="card" style={{ padding: "1.5rem", border: "1px solid var(--danger)", backgroundColor: "var(--danger-glow)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem", color: "var(--danger)" }}>
        <AlertCircle size={20} />
        <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Danger Zone — System Reset</h3>
      </div>
      
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
        Wipe specific database tables. These actions are permanent, irreversible, and logged in activity audits.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Bookings Reset */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1rem", borderBottom: "1px solid var(--card-border)" }} className="mobile-stacked-flex">
          <div>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 600 }}>Reset Bookings Database</h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>Deletes all reservations and marks rooms as available.</p>
          </div>
          <button className="btn btn-danger" onClick={handleClearBookings} disabled={actionLoading !== null}>
            <Trash2 size={15} style={{ color: "white" }} />
            <span>{actionLoading === "bookings" ? "Wiping Bookings..." : "Clear All Bookings"}</span>
          </button>
        </div>

        {/* Employees Reset */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1rem", borderBottom: "1px solid var(--card-border)" }} className="mobile-stacked-flex">
          <div>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 600 }}>Reset Staff Accounts</h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>Deletes all employee profiles except your admin session.</p>
          </div>
          <button className="btn btn-danger" onClick={handleClearEmployees} disabled={actionLoading !== null}>
            <Trash2 size={15} style={{ color: "white" }} />
            <span>{actionLoading === "employees" ? "Wiping Employees..." : "Clear All Employees"}</span>
          </button>
        </div>

        {/* Room Types Reset */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }} className="mobile-stacked-flex">
          <div>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 600 }}>Reset Rooms Configuration</h4>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>Wipes all room sizes, rates, and numbers.</p>
          </div>
          <button className="btn btn-danger" onClick={handleClearRoomTypes} disabled={actionLoading !== null}>
            <Trash2 size={15} style={{ color: "white" }} />
            <span>{actionLoading === "types" ? "Wiping Rooms..." : "Clear Room Configs"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetTab;
