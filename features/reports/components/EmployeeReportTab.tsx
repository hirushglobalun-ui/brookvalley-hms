"use client";

import React from "react";
import { Users, Award } from "lucide-react";

interface EmployeePerformance {
  empId: string;
  name: string;
  role: string;
  bookingsCreated: number;
  totalRevenueValue: number;
}

interface EmployeeReportTabProps {
  performance: EmployeePerformance[];
}

const EmployeeReportTab: React.FC<EmployeeReportTabProps> = ({ performance }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }} role="tabpanel" aria-label="Employee Reports Tab">
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrapper">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Role Claims</th>
                <th>Reservations Created</th>
                <th>Generated Revenue</th>
              </tr>
            </thead>
            <tbody>
              {performance.map(p => (
                <tr key={p.empId}>
                  <td style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--primary-glow)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem" }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{p.empId}</div>
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ padding: "3px 8px", fontSize: "0.7rem", backgroundColor: "var(--bg-secondary)", textTransform: "uppercase" }}>
                      {p.role}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{p.bookingsCreated}</td>
                  <td style={{ fontWeight: 800, color: "var(--success)" }}>₹{p.totalRevenueValue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {performance.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="mobile-stacked-grid">
          <div className="card" style={{ padding: "1.25rem 1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "10px", background: "var(--success-glow)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Award size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Top Performer (Revenue)</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "2px" }}>
                {performance[0]?.name || "N/A"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1px" }}>
                ₹{performance[0]?.totalRevenueValue.toLocaleString() || 0} revenue generated
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: "1.25rem 1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "10px", background: "rgba(59,130,246,0.1)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Most Bookings Created</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "2px" }}>
                {[...performance].sort((a,b) => b.bookingsCreated - a.bookingsCreated)[0]?.name || "N/A"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1px" }}>
                {[...performance].sort((a,b) => b.bookingsCreated - a.bookingsCreated)[0]?.bookingsCreated || 0} reservations handled
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeReportTab;
