"use client";

import React from "react";
import { BookOpen, TrendingUp, IndianRupee, Wallet, HandCoins, ArrowDownRight, Scale } from "lucide-react";

interface ReportsStatsCardsProps {
  totalBookings: number;
  confirmedCount: number;
  cancelledCount: number;
  totalGrossRevenue: number; // Total Booking Amount
  totalAgencyCommission: number; // Agency Commission
  totalNetRevenue: number; // Total - Agency Commission
  totalAdvanceReceived: number; // Advance Received
  totalPendingBalance: number; // Pending Balance
}

const ReportsStatsCards: React.FC<ReportsStatsCardsProps> = ({
  totalBookings,
  confirmedCount,
  cancelledCount,
  totalGrossRevenue,
  totalAgencyCommission,
  totalNetRevenue,
  totalAdvanceReceived,
  totalPendingBalance
}) => {
  const financialCards = [
    {
      label: "Total Booking Amount (Gross)",
      value: `₹${totalGrossRevenue.toLocaleString("en-IN")}`,
      subtitle: `${totalBookings} total reservations`,
      color: "var(--primary)",
      bg: "rgba(59,130,246,0.1)",
      icon: <IndianRupee size={20} />
    },
    {
      label: "Agency Commission (Minus)",
      value: `₹${totalAgencyCommission.toLocaleString("en-IN")}`,
      subtitle: "Paid/payable to agencies",
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.1)",
      icon: <ArrowDownRight size={20} />
    },
    {
      label: "Net Hotel Total",
      value: `₹${totalNetRevenue.toLocaleString("en-IN")}`,
      subtitle: "Total after commission",
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.1)",
      icon: <Scale size={20} />
    },
    {
      label: "Advance Received",
      value: `₹${totalAdvanceReceived.toLocaleString("en-IN")}`,
      subtitle: "Collected so far",
      color: "#8b5cf6",
      bg: "rgba(139, 92, 246, 0.1)",
      icon: <HandCoins size={20} />
    },
    {
      label: "Pending Balance Due",
      value: `₹${totalPendingBalance.toLocaleString("en-IN")}`,
      subtitle: "Remaining to collect",
      color: totalPendingBalance > 0 ? "#f59e0b" : "var(--text-secondary)",
      bg: totalPendingBalance > 0 ? "rgba(245, 158, 11, 0.12)" : "var(--bg-secondary)",
      icon: <Wallet size={20} />
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* 5 Core Financial Cards */}
      <div 
        style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", 
          gap: "1rem" 
        }} 
        role="region" 
        aria-label="Financial Breakdown Summary"
      >
        {financialCards.map((card) => (
          <div
            key={card.label}
            className="card"
            style={{
              padding: "1.1rem 1.25rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.85rem",
              borderRadius: "12px",
              boxShadow: "var(--shadow-sm)",
              border: "1px solid var(--card-border)"
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "10px",
                background: card.bg,
                color: card.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
              aria-hidden="true"
            >
              {card.icon}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: card.color, lineHeight: 1.2 }}>
                {card.value}
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "3px" }}>
                {card.label}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                {card.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Status Counts */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <BookOpen size={14} /> Total Bookings: <strong style={{ color: "var(--text-primary)" }}>{totalBookings}</strong>
        </span>
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <TrendingUp size={14} color="var(--success)" /> Active: <strong style={{ color: "var(--success)" }}>{confirmedCount}</strong>
        </span>
        {cancelledCount > 0 && (
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            Cancelled: <strong style={{ color: "var(--danger)" }}>{cancelledCount}</strong>
          </span>
        )}
      </div>
    </div>
  );
};

export default ReportsStatsCards;

