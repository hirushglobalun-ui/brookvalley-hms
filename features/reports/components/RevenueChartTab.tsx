"use client";

import React from "react";
import { DoorOpen, Building } from "lucide-react";

interface RevenueChartTabProps {
  roomTypeRevenue: {
    typeId: string;
    name: string;
    gross: number;
    revenue: number;
    commission?: number;
    advance?: number;
    count?: number;
  }[];
  roomRevenueList?: {
    roomNumber: string;
    roomTypeId: string;
    roomTypeName: string;
    gross: number;
    revenue: number;
    commission: number;
    advance: number;
    count: number;
  }[];
  maxRevenue: number;
}

const RevenueChartTab: React.FC<RevenueChartTabProps> = ({ roomTypeRevenue, roomRevenueList = [], maxRevenue }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }} role="tabpanel" aria-label="Revenue Chart Tab">
      {/* Room Type Revenue Summary Card */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Building size={18} className="text-primary" />
          <span>Revenue Contribution by Room Type (Multi-Room Allocated)</span>
        </h3>
        
        {roomTypeRevenue.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No data available.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {roomTypeRevenue.map(item => {
              const percent = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={item.typeId} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: "0.85rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{item.name}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Bookings Count: {item.count || 0}
                      </span>
                    </div>
                    
                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Gross: ₹{item.gross.toLocaleString()}</span>
                      {item.advance !== undefined && item.advance > 0 && (
                        <span style={{ fontSize: "0.75rem", color: "var(--primary)" }}>Advance Paid: ₹{item.advance.toLocaleString()}</span>
                      )}
                      {item.commission && item.commission > 0 ? (
                        <span style={{ fontSize: "0.75rem", color: "var(--danger)" }}>- ₹{item.commission.toLocaleString()} (Agency)</span>
                      ) : null}
                      <span style={{ fontWeight: 700, color: "var(--success)", borderTop: "1px solid var(--card-border)", paddingTop: "2px", marginTop: "2px", fontSize: "0.95rem" }}>
                        Net Collection: ₹{item.revenue.toLocaleString()}
                      </span>
                    </div>
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

      {/* Per-Room Individual Revenue Breakdown Table */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <DoorOpen size={18} className="text-primary" />
          <span>Individual Room Revenue Breakdown</span>
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
          Fair proportional revenue attribution per room for single & multi-room bookings.
        </p>

        {roomRevenueList.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No room revenue data available.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table-custom" style={{ fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th>Room Number</th>
                  <th>Room Type</th>
                  <th>Bookings Count</th>
                  <th>Advance Paid</th>
                  <th>Gross Amount</th>
                  <th>Agency Comm.</th>
                  <th>Net Collection</th>
                </tr>
              </thead>
              <tbody>
                {roomRevenueList.map(room => (
                  <tr key={room.roomNumber}>
                    <td style={{ fontWeight: 700, color: "var(--primary)", fontFamily: "monospace" }}>
                      <span className="badge" style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "var(--primary)", border: "1px solid var(--primary)", padding: "3px 8px" }}>
                        Room {room.roomNumber}
                      </span>
                    </td>
                    <td style={{ textTransform: "capitalize", fontWeight: 600 }}>{room.roomTypeName}</td>
                    <td>{room.count} Bookings</td>
                    <td style={{ color: "var(--primary)", fontWeight: 500 }}>₹{room.advance.toLocaleString()}</td>
                    <td>₹{room.gross.toLocaleString()}</td>
                    <td style={{ color: room.commission > 0 ? "var(--danger)" : "inherit" }}>
                      {room.commission > 0 ? `₹${room.commission.toLocaleString()}` : "—"}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--success)" }}>₹{room.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueChartTab;
