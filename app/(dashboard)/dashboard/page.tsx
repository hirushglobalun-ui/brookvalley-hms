"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../lib/auth";
import { BookingsService } from "../../../features/bookings";
import { SettingsService } from "../../../features/settings";
import { EmployeesService } from "../../../features/employees";
import { getActivityLogs, formatDate } from "../../../lib/db";
import { 
  BookOpen, 
  DoorOpen, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  UserCheck
} from "lucide-react";
import { Booking, Room, Employee, ActivityLog, RoomType } from "../../../types";
import { Skeleton } from "../../../components/ui/Skeleton";

const bookingsService = new BookingsService();
const settingsService = new SettingsService();
const employeesService = new EmployeesService();

const Dashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [bookingsData, roomsData, employeesData, logsData, roomTypesData] = await Promise.all([
        bookingsService.getBookings(),
        settingsService.getRooms(),
        employeesService.getEmployees(),
        getActivityLogs(15),
        settingsService.getRoomTypes()
      ]);
      
      setBookings(bookingsData.data);
      setRooms(roomsData);
      setEmployees(employeesData);
      setLogs(logsData);
      setRoomTypes(roomTypesData);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Quick status update handler for dashboard recent bookings
  const handleDashboardStatusUpdate = async (bookingId: string, newStatus: Booking["bookingStatus"]) => {
    const booking = bookings.find(b => b.bookingId === bookingId);
    if (!booking) return;
    try {
      await bookingsService.updateBookingStatus(bookingId, booking.bookingStatus, newStatus, booking, user);
      await fetchData();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm("WARNING: Are you sure you want to clear ALL activity logs? This action cannot be undone.")) return;
    if (!window.confirm("DOUBLE CONFIRMATION: Are you absolutely certain you want to wipe the activity history logs?")) return;
    try {
      const { clearAllLogs } = await import("../../../lib/db");
      await clearAllLogs(user);
      alert("All activity logs cleared successfully!");
      await fetchData();
    } catch (err: any) {
      alert("Failed to clear activity logs: " + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Welcome card skeleton */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <Skeleton width={240} height={28} style={{ marginBottom: "0.5rem" }} />
          <Skeleton width={320} height={14} />
        </div>

        {/* Metric Cards Skeleton */}
        <div className="grid-stats">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card stat-card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" }}>
              <Skeleton width={48} height={48} borderRadius={12} />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                <Skeleton width="50%" height={24} />
                <Skeleton width="80%" height={12} />
              </div>
            </div>
          ))}
        </div>

        {/* Content Table Skeleton */}
        <div className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Skeleton width={200} height={20} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <Skeleton width="20%" height={14} />
              <Skeleton width="30%" height={14} />
              <Skeleton width="25%" height={14} />
              <Skeleton width="15%" height={20} borderRadius={6} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  const todayStr = new Date().toISOString().split("T")[0];

  // Calculated Stats
  const totalBookings = bookings.length;
  const myBookings = bookings.filter(b => b.createdByUid === user.uid);
  const myBookingsCount = myBookings.length;

  const todayCheckIns = bookings.filter(b => b.checkInDate === todayStr && b.bookingStatus !== "cancelled");
  const todayCheckOuts = bookings.filter(b => b.checkOutDate === todayStr && b.bookingStatus !== "cancelled");

  const totalRoomsCount = rooms.length;
  const employeeCount = employees.length;

  // Derive occupied rooms from checked-in bookings (reliable source of truth)
  const checkedInBookings = bookings.filter(b => b.bookingStatus === "checked-in");
  const occupiedRoomEntries: { room: Room; booking: Booking }[] = [];
  checkedInBookings.forEach(booking => {
    const roomNumbers = booking.roomNumber ? booking.roomNumber.split(",").map(r => r.trim()) : [];
    roomNumbers.forEach(rn => {
      const roomData = rooms.find(r => r.roomNumber === rn);
      if (roomData) {
        occupiedRoomEntries.push({ room: roomData, booking });
      }
    });
  });
  // Also include rooms marked occupied in DB but without a matching checked-in booking (edge case)
  rooms.filter(r => r.status === "occupied").forEach(room => {
    if (!occupiedRoomEntries.find(e => e.room.roomNumber === room.roomNumber)) {
      const matchingBooking = bookings.find(b => {
        if (b.bookingStatus !== "checked-in") return false;
        const rns = b.roomNumber ? b.roomNumber.split(",").map(r => r.trim()) : [];
        return rns.includes(room.roomNumber);
      });
      occupiedRoomEntries.push({ room, booking: matchingBooking as Booking });
    }
  });
  const occupiedRooms = occupiedRoomEntries.length;

  // Masking utility for employee view
  const maskText = (text: string | number, booking: Booking) => {
    if (user.role === "admin" || user.role === "developer" || user.role === "manager") return String(text);
    if (booking.createdByUid === user.uid) return String(text);
    return "[Restricted]";
  };

  // Permission check for updating booking status dropdown
  const canUpdateBookingStatus = (booking: Booking) => {
    if (user.role === "admin" || user.role === "developer" || user.role === "manager") return true;
    return booking.createdByUid === user.uid;
  };

  // Recent bookings list (limit 5)
  const sortedBookings = [...bookings]
    .sort((a, b) => {
      const dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
      const dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
      return dateB - dateA;
    });

  const recentBookings = sortedBookings.slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Welcome Banner */}
      <div className="card welcome-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap" }}>
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
        {(user.role === "admin" || user.role === "developer" || user.role === "manager") ? (
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
              <div className="stat-icon" style={{ backgroundColor: "rgba(59, 130, 246, 0.08)", color: "var(--info)" }}>
                <ArrowUpRight size={24} />
              </div>
              <div className="stat-info">
                <span className="value stat-value">{todayCheckIns.length}</span>
                <span className="stat-label">Check-ins Today</span>
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

      {/* Occupied Rooms Status Section */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <div className="card-header" style={{ marginBottom: "1rem" }}>
          <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <DoorOpen size={18} className="text-primary" />
            <span>Current Room Occupancy ({occupiedRoomEntries.length} occupied)</span>
          </h2>
        </div>
        
        <div className="table-wrapper">
          {occupiedRoomEntries.length > 0 ? (
            <table className="table-custom" style={{ fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th>Room Number</th>
                  <th>Room Type</th>
                  <th>Guest Name</th>
                  <th>Contact Info</th>
                  <th>Stay Dates</th>
                  <th>Guests Count</th>
                </tr>
              </thead>
              <tbody>
                {occupiedRoomEntries.map(({ room, booking: activeBooking }) => {
                  const displayTypeName = roomTypes.find(rt => rt.id === room.roomType)?.name || room.roomType;
                  
                  return (
                    <tr key={room.roomNumber}>
                      <td style={{ fontWeight: 700, color: "var(--primary)" }}>Room {room.roomNumber}</td>
                      <td style={{ textTransform: "capitalize" }}>{displayTypeName}</td>
                      {activeBooking ? (
                        <>
                          <td>{maskText(activeBooking.customerName, activeBooking)}</td>
                          <td>{maskText(activeBooking.customerPhone, activeBooking)}</td>
                          <td>
                            <span style={{ fontWeight: 500 }}>
                              {formatDate(activeBooking.checkInDate)} to {formatDate(activeBooking.checkOutDate)}
                            </span>
                          </td>
                          <td>{activeBooking.guestCount || 1} Guests</td>
                        </>
                      ) : (
                        <td colSpan={4} style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                          Room marked occupied (no matching checked-in booking found).
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="no-data" style={{ padding: "1.5rem" }}>No rooms are currently occupied.</div>
          )}
        </div>
      </div>

      {/* Bottom Section: Recent Activity / Today Checklist */}
      <div className={(user.role === "admin" || user.role === "developer" || user.role === "manager") ? "grid-2col-responsive" : ""} style={{ marginTop: "0.5rem" }}>
        
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
                      <th>Status</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map(b => (
                      <tr key={b.bookingId}>
                        <td>Room {b.roomNumber}</td>
                        <td>{maskText(b.customerName, b)}</td>
                        <td>{formatDate(b.checkInDate)} to {formatDate(b.checkOutDate)}</td>
                        <td>{b.createdByName} ({b.createdByRole})</td>
                        <td>
                          {canUpdateBookingStatus(b) ? (
                            <select 
                              className={`badge badge-${
                                b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in" ? "success" : 
                                b.bookingStatus === "cancelled" ? "danger" : "warning"
                              }`}
                              style={{ width: "fit-content", fontSize: "0.7rem", padding: "2px 16px 2px 6px", border: "none", cursor: "pointer", fontWeight: 600 }}
                              value={b.bookingStatus}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleDashboardStatusUpdate(b.bookingId, e.target.value as Booking["bookingStatus"]);
                              }}
                            >
                              <option value="pending">PENDING</option>
                              <option value="confirmed">CONFIRMED</option>
                              <option value="checked-in">CHECKED-IN</option>
                              <option value="checked-out">CHECKED-OUT</option>
                              <option value="cancelled">CANCELLED</option>
                            </select>
                          ) : (
                            <span 
                              className={`badge badge-${
                                b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in" ? "success" : 
                                b.bookingStatus === "cancelled" ? "danger" : "warning"
                              }`}
                              style={{ width: "fit-content", fontSize: "0.7rem", padding: "4px 10px", fontWeight: 600, textTransform: "uppercase" }}
                            >
                              {b.bookingStatus}
                            </span>
                          )}
                        </td>
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
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          {canUpdateBookingStatus(b) ? (
                            <select 
                              className={`badge badge-${
                                b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in" ? "success" : 
                                b.bookingStatus === "cancelled" ? "danger" : "warning"
                              }`}
                              style={{ fontSize: "0.7rem", padding: "2px 16px 2px 6px", border: "none", cursor: "pointer", fontWeight: 600, margin: 0 }}
                              value={b.bookingStatus}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleDashboardStatusUpdate(b.bookingId, e.target.value as Booking["bookingStatus"]);
                              }}
                            >
                              <option value="pending">PENDING</option>
                              <option value="confirmed">CONFIRMED</option>
                              <option value="checked-in">CHECKED-IN</option>
                              <option value="checked-out">CHECKED-OUT</option>
                              <option value="cancelled">CANCELLED</option>
                            </select>
                          ) : (
                            <span 
                              className={`badge badge-${
                                b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in" ? "success" : 
                                b.bookingStatus === "cancelled" ? "danger" : "warning"
                              }`}
                              style={{ fontSize: "0.7rem", padding: "3px 10px", fontWeight: 600, textTransform: "uppercase", margin: 0 }}
                            >
                              {b.bookingStatus}
                            </span>
                          )}
                          <span className="booking-card-amount">₹{maskText(b.totalAmount, b)}</span>
                        </div>
                      </div>
                      <div className="booking-card-row">
                        <span className="booking-card-customer">{maskText(b.customerName, b)}</span>
                      </div>
                      <div className="booking-card-dates">
                        <span>{formatDate(b.checkInDate)} to {formatDate(b.checkOutDate)}</span>
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

        {/* Activity Logs Feed */}
        {logs.length > 0 && (
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: 0 }}>
                <Activity size={18} className="text-primary" />
                <span>Recent Audit Logs</span>
              </h2>
              {(user.role === "admin" || user.role === "developer" || user.role === "manager") && (
                <button 
                  onClick={handleClearLogs}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--danger)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: "6px",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--danger-glow)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  Clear Logs
                </button>
              )}
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
