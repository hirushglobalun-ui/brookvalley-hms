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
      <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
        <div className="flex-between">
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Welcome, {user.fullName}!
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Here is what's happening at Brookvalley Hotel today.
            </p>
          </div>
          <div className="badge badge-info" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            <UserCheck size={14} style={{ marginRight: "4px" }} />
            <span>Role: {user.role}</span>
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
      <div style={{ display: "grid", gridTemplateColumns: user.role === "admin" ? "1fr 1fr" : "1fr", gap: "1.5rem" }}>
        
        {/* Recent Bookings Feed (Masked for employee) */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Hotel Bookings</h2>
          </div>
          <div className="table-wrapper">
            {recentBookings.length > 0 ? (
              <table className="table-custom" style={{ fontSize: "0.85rem" }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "250px", overflowY: "auto", paddingRight: "0.25rem" }}>
              {logs.length > 0 ? (
                logs.map(log => {
                  const date = log.createdAt?.seconds 
                    ? new Date(log.createdAt.seconds * 1000).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })
                    : "";
                  return (
                    <div 
                      key={log.id} 
                      style={{ 
                        padding: "0.6rem 0.85rem", 
                        backgroundColor: "var(--bg-primary)", 
                        border: "1px solid var(--card-border)", 
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "0.5rem"
                      }}
                    >
                      <div>
                        <p style={{ fontSize: "0.825rem", fontWeight: 600, color: "var(--text-primary)" }}>{log.details}</p>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                          By: {log.userName} ({log.userRole})
                        </p>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{date}</span>
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
