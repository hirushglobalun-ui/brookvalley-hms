import React, { useState, useEffect } from "react";
import { useAuth } from "../firebase/auth";
import { getBookings, getRooms, getEmployees, getActivityLogs } from "../firebase/db";
import { 
  BookOpen, 
  DoorOpen, 
  Users, 
  CalendarDays, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  Activity,
  UserCheck
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [bookingsData, roomsData, employeesData, logsData] = await Promise.all([
          getBookings(),
          getRooms(),
          getEmployees(),
          user.role === "admin" ? getActivityLogs(8) : Promise.resolve([])
        ]);
        
        setBookings(bookingsData);
        setRooms(roomsData);
        setEmployees(employeesData);
        setLogs(logsData);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <p style={{ color: "var(--text-secondary)" }}>Loading dashboard analytics...</p>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];

  // Calculated Stats
  const totalBookings = bookings.length;
  const myBookings = bookings.filter(b => b.createdByUid === user.uid);
  const myBookingsCount = myBookings.length;

  const todayCheckIns = bookings.filter(b => b.checkInDate === todayStr && b.bookingStatus !== "cancelled");
  const todayCheckOuts = bookings.filter(b => b.checkOutDate === todayStr && b.bookingStatus !== "cancelled");

  const occupiedRooms = rooms.filter(r => r.status === "occupied").length;
  const availableRooms = rooms.filter(r => r.status === "available").length;
  const maintenanceRooms = rooms.filter(r => r.status === "maintenance").length;
  const totalRoomsCount = rooms.length;

  const employeeCount = employees.length;

  // Masking utility for employee view
  const maskText = (text, booking) => {
    if (user.role === "admin") return text;
    if (booking.createdByUid === user.uid) return text;
    return "[Restricted]";
  };

  // Recent bookings list (limit 5)
  const sortedBookings = [...bookings]
    .sort((a, b) => {
      const dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
      const dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
      return dateB - dateA;
    });

  const recentBookings = sortedBookings.slice(0, 5);

  // Employee-filtered bookings list for Employee Dashboard
  const myUpcomingBookings = myBookings
    .filter(b => b.checkInDate >= todayStr && b.bookingStatus !== "cancelled")
    .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate))
    .slice(0, 5);

  // SVG Chart: Bookings created by each employee (Admin Only)
  const employeeBookingStats = employees.map(emp => {
    const count = bookings.filter(b => b.createdByUid === emp.uid).length;
    return { name: emp.fullName, count };
  });
  
  const maxEmpBookings = Math.max(...employeeBookingStats.map(s => s.count), 1);

  // Weekly bookings summary (Custom bar chart data)
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  };

  const last7Days = getLast7Days();
  const weeklyBookingStats = last7Days.map(date => {
    const count = bookings.filter(b => {
      if (!b.createdAt) return false;
      const bDate = new Date(b.createdAt.seconds * 1000).toISOString().split("T")[0];
      return bDate === date;
    }).length;
    const label = new Date(date).toLocaleDateString("en-US", { weekday: "short" });
    return { label, count, date };
  });

  const maxWeeklyCount = Math.max(...weeklyBookingStats.map(w => w.count), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Welcome Banner */}
      <div className="card welcome-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.7rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em", margin: 0 }}>
              Welcome, {user.fullName}!
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.40rem", margin: 0 }}>
              Here is what's happening at Brookvalley Hotel today.
            </p>
          </div>
          <div style={{
            backgroundColor: "rgba(59, 130, 246, 0.08)",
            color: "var(--primary)",
            padding: "0.55rem 1.25rem",
            borderRadius: "99px",
            fontSize: "0.8rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            border: "1px solid rgba(59, 130, 246, 0.15)"
          }}>
            <UserCheck size={14} />
            <span>ROLE: {user.role?.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid-stats">
        {user.role === "admin" ? (
          <>
            <div className="card stat-card">
              <div className="stat-icon" style={{ backgroundColor: "var(--primary-glow)", color: "var(--primary)" }}>
                <BookOpen size={24} />
              </div>
              <div className="stat-info">
                <span className="value stat-value">{totalBookings}</span>
                <span className="stat-label">Total Bookings</span>
              </div>
            </div>
            
            <div className="card stat-card">
              <div className="stat-icon" style={{ backgroundColor: "var(--success-glow)", color: "var(--success)" }}>
                <DoorOpen size={24} />
              </div>
              <div className="stat-info">
                <span className="value stat-value">{occupiedRooms} / {totalRoomsCount}</span>
                <span className="stat-label">Occupied Rooms</span>
              </div>
            </div>



            <div className="card stat-card">
              <div className="stat-icon" style={{ backgroundColor: "var(--warning-glow)", color: "var(--warning)" }}>
                <Users size={24} />
              </div>
              <div className="stat-info">
                <span className="value stat-value">{employeeCount}</span>
                <span className="stat-label">Total Employees</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="card stat-card">
              <div className="stat-icon" style={{ backgroundColor: "var(--primary-glow)", color: "var(--primary)" }}>
                <BookOpen size={24} />
              </div>
              <div className="stat-info">
                <span className="value stat-value">{myBookingsCount}</span>
                <span className="stat-label">My Created Bookings</span>
              </div>
            </div>
            
            <div className="card stat-card">
              <div className="stat-icon" style={{ backgroundColor: "var(--success-glow)", color: "var(--success)" }}>
                <DoorOpen size={24} />
              </div>
              <div className="stat-info">
                <span className="value stat-value">{occupiedRooms} / {totalRoomsCount}</span>
                <span className="stat-label">Hotel Occupied Rooms</span>
              </div>
            </div>

            <div className="card stat-card">
              <div className="stat-icon" style={{ backgroundColor: "var(--info-glow)", color: "var(--info)" }}>
                <ArrowUpRight size={24} />
              </div>
              <div className="stat-info">
                <span className="value stat-value">
                  {todayCheckIns.filter(b => b.createdByUid === user.uid).length}
                </span>
                <span className="stat-label">My Check-ins Today</span>
              </div>
            </div>

            <div className="card stat-card">
              <div className="stat-icon" style={{ backgroundColor: "var(--warning-glow)", color: "var(--warning)" }}>
                <ArrowDownRight size={24} />
              </div>
              <div className="stat-info">
                <span className="value stat-value">
                  {todayCheckOuts.filter(b => b.createdByUid === user.uid).length}
                </span>
                <span className="stat-label">My Check-outs Today</span>
              </div>
            </div>
          </>
        )}
      </div>



      {/* Bottom Section: Recent Activity / Today Checklist */}
      <div className={user.role === "admin" ? "grid-2col-responsive" : ""} style={{ marginTop: "0.5rem" }}>
        
        {/* Recent Bookings Feed (Masked for employee) */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Hotel Bookings</h2>
          </div>
          <div className="table-wrapper">
            {recentBookings.length > 0 ? (
              <>
                {/* Desktop/Tablet Table Layout */}
                <table className="table-custom recent-bookings-table" style={{ fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Customer Name</th>
                      <th>Dates</th>
                      <th>Created By</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map(b => (
                      <tr key={b.bookingId}>
                        <td>Room {b.roomNumber}</td>
                        <td>{maskText(b.customerName, b)}</td>
                        <td>{b.checkInDate} to {b.checkOutDate}</td>
                        <td>{b.createdByName} ({b.createdByRole})</td>
                        <td style={{ fontWeight: 600 }}>₹{maskText(b.totalAmount, b)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Card List Layout */}
                <div className="recent-bookings-cards">
                  {recentBookings.map(b => (
                    <div key={b.bookingId} className="booking-mobile-card">
                      <div className="booking-card-row">
                        <span className="booking-card-room">Room {b.roomNumber}</span>
                        <span className="booking-card-amount">₹{maskText(b.totalAmount, b)}</span>
                      </div>
                      <div className="booking-card-row">
                        <span className="booking-card-customer">{maskText(b.customerName, b)}</span>
                      </div>
                      <div className="booking-card-dates">
                        <span>{b.checkInDate} to {b.checkOutDate}</span>
                      </div>
                      <div className="booking-card-footer">
                        <span>By: {b.createdByName} ({b.createdByRole})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="no-data">No bookings recorded.</div>
            )}
          </div>
        </div>

        {/* Activity Logs Feed (Admin Only) */}
        {user.role === "admin" && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Activity size={18} className="text-primary" />
                <span>Recent Audit Logs</span>
              </h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "350px", overflowY: "auto", paddingRight: "0.25rem" }}>
              {logs.length > 0 ? (
                logs.map(log => {
                  const date = log.createdAt?.seconds 
                    ? new Date(log.createdAt.seconds * 1000).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })
                    : "";
                  const isAdmin = log.userRole === "admin";
                  return (
                    <div 
                      key={log.id} 
                      style={{ 
                        padding: "0.75rem 1rem", 
                        backgroundColor: "var(--bg-secondary)", 
                        border: "1px solid var(--card-border)", 
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "1rem",
                        boxShadow: "var(--shadow-sm)"
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>
                          {log.details}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            By: {log.userName}
                          </span>
                          <span style={{ 
                            fontSize: "0.65rem", 
                            fontWeight: 700, 
                            padding: "2px 8px", 
                            borderRadius: "99px", 
                            textTransform: "uppercase",
                            backgroundColor: isAdmin ? "rgba(168, 85, 247, 0.1)" : "rgba(16, 185, 129, 0.1)",
                            color: isAdmin ? "#a855f7" : "#10b981",
                            border: `1px solid ${isAdmin ? "rgba(168, 85, 247, 0.15)" : "rgba(16, 185, 129, 0.15)"}`
                          }}>
                            {log.userRole}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap", fontWeight: 500 }}>
                        {date}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="no-data" style={{ padding: "1.5rem" }}>No system logs yet.</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
