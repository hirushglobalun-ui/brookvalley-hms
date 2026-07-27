"use client";

import React from "react";
import { BookOpen, TrendingUp, XCircle, IndianRupee, Wallet } from "lucide-react";

interface ReportsStatsCardsProps {
  totalBookings: number;
  confirmedCount: number;
  cancelledCount: number;
  totalRevenue: number;
  totalGrossRevenue?: number;
  totalPendingBalance: number;
  totalAgencyCommission?: number;
}

const ReportsStatsCards: React.FC<ReportsStatsCardsProps> = ({
  totalBookings,
  confirmedCount,
  cancelledCount,
  totalRevenue,
  totalGrossRevenue = 0,
  totalPendingBalance,
  totalAgencyCommission = 0
}) => {
  const stats = [
    { label: "Total Bookings", value: totalBookings, color: "var(--primary)", bg: "rgba(59,130,246,0.1)", icon: <BookOpen size={20} /> },
    { label: "Active Bookings", value: confirmedCount, color: "var(--success)", bg: "var(--success-glow)", icon: <TrendingUp size={20} /> },
    { label: "Cancelled", value: cancelledCount, color: "var(--danger)", bg: "var(--danger-glow)", icon: <XCircle size={20} /> },
    { 
      label: "Collected Revenue (Net)", 
      value: totalAgencyCommission > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500, lineHeight: 1 }}>Gross: ₹{totalGrossRevenue.toLocaleString()}</span>
          <span style={{ fontSize: "0.85rem", color: "var(--danger)", fontWeight: 600, lineHeight: 1 }}>- ₹{totalAgencyCommission.toLocaleString()} <span style={{fontSize:"0.75rem", fontWeight: 400}}>(Agency)</span></span>
          <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#a855f7", lineHeight: 1, marginTop: "2px" }}>Balance: ₹{totalRevenue.toLocaleString()}</span>
        </div>
      ) : (
        `₹${totalRevenue.toLocaleString()}`
      ), 
      color: "#a855f7", 
      bg: "rgba(168,85,247,0.1)", 
      icon: <IndianRupee size={20} /> 
    },
    { label: "Pending Balance", value: `₹${totalPendingBalance.toLocaleString()}`, color: "var(--warning)", bg: "var(--warning-glow)", icon: <Wallet size={20} /> },
    { label: "Agency Commission", value: `₹${totalAgencyCommission.toLocaleString()}`, color: "var(--info, #3b82f6)", bg: "rgba(59,130,246,0.1)", icon: <IndianRupee size={20} /> },
  ];

  return (
    <div className="grid-stats-responsive" role="region" aria-label="Key Performance Indicators Summary">
      {stats.map(s => (
        <div key={s.label} className="card" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: "10px", background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true">
            {s.icon}
          </div>
          <div>
            <div style={{ fontSize: typeof s.value === "string" || typeof s.value === "number" ? "1.5rem" : "unset", fontWeight: typeof s.value === "string" || typeof s.value === "number" ? 800 : "normal", color: s.color, lineHeight: typeof s.value === "string" || typeof s.value === "number" ? 1.1 : "normal" }}>{s.value}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReportsStatsCards;
