"use client";

import React from "react";
import { BookOpen, TrendingUp, XCircle, IndianRupee, Wallet } from "lucide-react";

interface ReportsStatsCardsProps {
  totalBookings: number;
  confirmedCount: number;
  cancelledCount: number;
  totalRevenue: number;
  totalPendingBalance: number;
}

const ReportsStatsCards: React.FC<ReportsStatsCardsProps> = ({
  totalBookings,
  confirmedCount,
  cancelledCount,
  totalRevenue,
  totalPendingBalance
}) => {
  const stats = [
    { label: "Total Bookings", value: totalBookings, color: "var(--primary)", bg: "rgba(59,130,246,0.1)", icon: <BookOpen size={20} /> },
    { label: "Active Bookings", value: confirmedCount, color: "var(--success)", bg: "var(--success-glow)", icon: <TrendingUp size={20} /> },
    { label: "Cancelled", value: cancelledCount, color: "var(--danger)", bg: "var(--danger-glow)", icon: <XCircle size={20} /> },
    { label: "Collected Revenue", value: `₹${totalRevenue.toLocaleString()}`, color: "#a855f7", bg: "rgba(168,85,247,0.1)", icon: <IndianRupee size={20} /> },
    { label: "Pending Balance", value: `₹${totalPendingBalance.toLocaleString()}`, color: "var(--warning)", bg: "var(--warning-glow)", icon: <Wallet size={20} /> },
  ];

  return (
    <div className="grid-stats-responsive" role="region" aria-label="Key Performance Indicators Summary">
      {stats.map(s => (
        <div key={s.label} className="card" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: "10px", background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} aria-hidden="true">
            {s.icon}
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReportsStatsCards;
