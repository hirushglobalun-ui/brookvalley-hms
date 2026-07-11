"use client";

import React from "react";

interface RevenueChartTabProps {
  roomTypeRevenue: {
    typeId: string;
    name: string;
    revenue: number;
  }[];
  maxRevenue: number;
}

const RevenueChartTab: React.FC<RevenueChartTabProps> = ({ roomTypeRevenue, maxRevenue }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }} role="tabpanel" aria-label="Revenue Chart Tab">
      <div className="card" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.5rem" }}>Revenue Contribution by Room Type</h3>
        
        {roomTypeRevenue.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No data available.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {roomTypeRevenue.map(item => {
              const percent = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={item.typeId} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                    <span style={{ fontWeight: 700, color: "var(--success)" }}>₹{item.revenue.toLocaleString()}</span>
                  </div>
                  
                  <div style={{ 
                    width: "100%", 
                    height: "10px", 
                    backgroundColor: "var(--bg-tertiary)", 
                    borderRadius: "5px", 
                    overflow: "hidden" 
                  }}>
                    <div style={{ 
                      width: `${percent}%`, 
                      height: "100%", 
                      background: "linear-gradient(90deg, var(--primary) 0%, var(--success) 100%)", 
                      borderRadius: "5px",
                      transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueChartTab;
