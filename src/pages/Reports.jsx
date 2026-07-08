import React, { useState, useEffect } from "react";
import { useAuth } from "../firebase/auth";
import { getBookings, getRooms, getRoomTypes, getEmployees } from "../firebase/db";
import {
  Download,
  BarChart3,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  BedDouble,
  CalendarDays,
  IndianRupee,
  User,
  CreditCard,
  MessageSquare,
  Clock,
  TrendingUp,
  XCircle,
  BookOpen
} from "lucide-react";

const statusColor = (status) => {
  switch (status) {
    case "confirmed":    return { bg: "var(--success-glow)", color: "var(--success)" };
    case "checked-in":  return { bg: "rgba(59,130,246,0.12)", color: "var(--primary)" };
    case "checked-out": return { bg: "var(--bg-tertiary)", color: "var(--text-secondary)" };
    case "cancelled":   return { bg: "var(--danger-glow)", color: "var(--danger)" };
    case "pending":     return { bg: "var(--warning-glow)", color: "var(--warning)" };
    default:            return { bg: "var(--bg-tertiary)", color: "var(--text-secondary)" };
  }
};

const payColor = (status) => {
  switch (status) {
    case "paid":     return { bg: "var(--success-glow)", color: "var(--success)" };
    case "partial":  return { bg: "var(--warning-glow)", color: "var(--warning)" };
    case "unpaid":   return { bg: "var(--danger-glow)", color: "var(--danger)" };
    default:         return { bg: "var(--bg-tertiary)", color: "var(--text-secondary)" };
  }
};

const Reports = () => {
  const { user } = useAuth();

  const [bookings, setBookings]     = useState([]);
  const [rooms, setRooms]           = useState([]);
  const [roomTypes, setRoomTypes]   = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(true);

  // Filters
  const [searchQuery, setSearchQuery]       = useState("");
  const [filterStatus, setFilterStatus]     = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterMonth, setFilterMonth]       = useState("all"); // YYYY-MM or "all"
  const [expandedId, setExpandedId]         = useState(null);

  // Active section tab
  const [activeSection, setActiveSection] = useState("bookings");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [bData, rData, rtData, empData] = await Promise.all([
          getBookings(), getRooms(), getRoomTypes(), getEmployees()
        ]);
        setBookings(bData); setRooms(rData); setRoomTypes(rtData); setEmployees(empData);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  // Exportable bookings based on role
  const exportableBookings = user.role === "admin"
    ? bookings
    : bookings.filter(b => b.createdByUid === user.uid);

  // Filter bookings by selected month
  const monthBookings = exportableBookings.filter(b => {
    if (filterMonth === "all") return true;
    return b.checkInDate && b.checkInDate.substring(0, 7) === filterMonth;
  });

  // Filtered bookings for detail table
  const filteredBookings = monthBookings.filter(b => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || b.bookingId?.toLowerCase().includes(q)
      || b.customerName?.toLowerCase().includes(q)
      || b.customerPhone?.includes(q)
      || b.customerEmail?.toLowerCase().includes(q)
      || b.roomNumber?.toLowerCase().includes(q)
      || b.roomType?.toLowerCase().includes(q);
    const matchStatus   = filterStatus === "all"   || b.bookingStatus === filterStatus;
    const matchEmployee = filterEmployee === "all" || b.createdByUid === filterEmployee;
    return matchSearch && matchStatus && matchEmployee;
  });

  // Stats
  const totalRevenue   = monthBookings.filter(b => b.bookingStatus !== "cancelled").reduce((s, b) => s + (b.totalAmount || 0), 0);
  const totalBookings  = monthBookings.length;
  const confirmedCount = monthBookings.filter(b => b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in").length;
  const cancelledCount = monthBookings.filter(b => b.bookingStatus === "cancelled").length;

  // Employee performance data
  const employeeStats = employees.map(emp => {
    const empBookings = monthBookings.filter(b => b.createdByUid === emp.uid);
    const revenue     = empBookings.filter(b => b.bookingStatus !== "cancelled").reduce((s, b) => s + (b.totalAmount || 0), 0);
    return { ...emp, count: empBookings.length, revenue, bookings: empBookings };
  }).sort((a, b) => b.count - a.count);

  const maxEmpCount = Math.max(...employeeStats.map(e => e.count), 1);

  // Revenue by Room Type
  const revenueByRoomType = roomTypes.map(rt => {
    const val = monthBookings.filter(b => b.roomType === rt.id && b.bookingStatus !== "cancelled").reduce((s, b) => s + (b.totalAmount || 0), 0);
    return { name: rt.name, value: val };
  }).sort((a, b) => b.value - a.value);
  const maxRevenue = Math.max(...revenueByRoomType.map(r => r.value), 1);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredBookings.length === 0) { alert("No records to export."); return; }
    const headers = ["Booking ID","Customer Name","Phone","Email","Address","Room Type","Room Number","Check-In","Check-Out","Nights","Guests","Total (INR)","Payment Status","Booking Status","Created By","Created By Role","Remarks","Created Date"];
    const rows = filteredBookings.map(b => {
      const nights = b.checkInDate && b.checkOutDate
        ? Math.max(1, Math.ceil((new Date(b.checkOutDate) - new Date(b.checkInDate)) / 86400000))
        : "";
      return [
        b.bookingId,
        `"${(b.customerName || "").replace(/"/g, '""')}"`,
        `"${b.customerPhone || ""}"`,
        b.customerEmail || "",
        `"${(b.customerAddress || "").replace(/"/g, '""')}"`,
        b.roomType,
        b.roomNumber,
        b.checkInDate,
        b.checkOutDate,
        nights,
        b.guestCount || 1,
        b.totalAmount,
        b.paymentStatus,
        b.bookingStatus,
        b.createdByName,
        b.createdByRole,
        `"${(b.remarks || "").replace(/"/g, '""')}"`,
        b.createdAt ? new Date(b.createdAt.seconds * 1000).toLocaleDateString() : ""
      ];
    });
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `Brookvalley_Report_${new Date().toISOString().split("T")[0]}.csv`;
    a.style.visibility = "hidden";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <p style={{ color: "var(--text-secondary)" }}>Loading report data...</p>
    </div>
  );

  const sections = [
    { id: "bookings",  label: "Booking Details", icon: <FileText size={15} /> },
    { id: "employees", label: "Employee Report", icon: <Users size={15} /> },
    { id: "revenue",   label: "Revenue Chart",   icon: <BarChart3 size={15} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Reports & Analytics</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Full booking records, customer details, and employee performance.
          </p>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>Month Filter:</span>
            <input 
              type="month" 
              className="input-control" 
              style={{ width: "auto", margin: 0, padding: "0.45rem 0.85rem", fontSize: "0.85rem", height: "38px" }}
              value={filterMonth === "all" ? "" : filterMonth}
              onChange={e => setFilterMonth(e.target.value || "all")}
            />
            {filterMonth !== "all" && (
              <button 
                className="btn" 
                style={{ padding: "0.45rem 0.85rem", fontSize: "0.85rem", height: "38px", background: "var(--bg-tertiary)", border: "1px solid var(--card-border)", color: "var(--text-secondary)" }} 
                onClick={() => setFilterMonth("all")}
              >
                All Time
              </button>
            )}
          </div>
          
          <button className="btn btn-primary" style={{ height: "38px" }} onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export CSV ({filteredBookings.length} records)</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid-stats-responsive">
        {[
          { label: "Total Bookings",   value: totalBookings,               color: "var(--primary)",  bg: "rgba(59,130,246,0.1)", icon: <BookOpen size={20} /> },
          { label: "Active Bookings",  value: confirmedCount,              color: "var(--success)",  bg: "var(--success-glow)", icon: <TrendingUp size={20} /> },
          { label: "Cancelled",        value: cancelledCount,              color: "var(--danger)",   bg: "var(--danger-glow)", icon: <XCircle size={20} /> },
          { label: "Total Revenue",    value: `₹${totalRevenue.toLocaleString()}`, color: "#a855f7", bg: "rgba(168,85,247,0.1)", icon: <IndianRupee size={20} /> },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: "10px", background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Section Tabs */}
      <div className="report-tabs-container">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.5rem 1.25rem", borderRadius: "99px", border: "none", cursor: "pointer",
            fontSize: "0.875rem", fontWeight: 600, transition: "all 0.2s ease",
            background: activeSection === s.id ? "var(--primary)" : "transparent",
            color: activeSection === s.id ? "#fff" : "var(--text-secondary)",
            boxShadow: activeSection === s.id ? "0 2px 8px rgba(16, 185, 129, 0.2)" : "none"
          }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ── SECTION: BOOKING DETAILS ── */}
      {activeSection === "bookings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Filter Bar */}
          <div className="card" style={{ padding: "1rem 1.25rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                className="input-control"
                style={{ paddingLeft: "2.25rem", margin: 0 }}
                placeholder="Search by name, phone, booking ID, room..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="report-filter-dropdowns">
              <select className="input-control" style={{ width: "auto", margin: 0 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked-in">Checked-In</option>
                <option value="checked-out">Checked-Out</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {user.role === "admin" && (
                <select className="input-control" style={{ width: "auto", margin: 0 }} value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
                  <option value="all">All Employees</option>
                  {employees.map(emp => <option key={emp.uid} value={emp.uid}>{emp.fullName}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Booking Records Table */}
          {filteredBookings.length === 0 ? (
            <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>No bookings found.</div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="table-wrapper">
                <table className="table-custom">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Customer Name</th>
                      <th>Phone Number</th>
                      <th>Stay Dates</th>
                      <th>Created By</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map(b => {
                      const sc = statusColor(b.bookingStatus);
                      const pc = payColor(b.paymentStatus);
                      return (
                        <tr key={b.bookingId}>
                          <td style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--primary)" }}>{b.bookingId}</td>
                          <td style={{ fontWeight: 600 }}>{b.customerName}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{b.customerPhone}</td>
                          <td>
                            <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                              {b.checkInDate} to {b.checkOutDate}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                              {b.createdByName}
                            </span>
                            <br />
                            <span className="badge" style={{ padding: "1px 4px", fontSize: "0.65rem", backgroundColor: "var(--bg-tertiary)", textTransform: "uppercase" }}>
                              {b.createdByRole}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <span style={{ ...sc, width: "fit-content", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "99px", fontWeight: 700, textTransform: "uppercase" }}>
                                {b.bookingStatus}
                              </span>
                              <span style={{ ...pc, width: "fit-content", fontSize: "0.65rem", padding: "1px 6px", borderRadius: "99px", fontWeight: 700, textTransform: "uppercase", border: "1px solid currentColor", background: "none" }}>
                                {b.paymentStatus}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SECTION: EMPLOYEE REPORT ── */}
      {activeSection === "employees" && user.role === "admin" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {employeeStats.map((emp, idx) => (
            <div key={emp.uid} className="card" style={{ padding: "1.5rem" }}>
              {/* Employee Header */}
              <div className="report-employee-header">
                <div style={{
                  width: 46, height: 46, borderRadius: "50%",
                  background: `hsl(${(idx * 47) % 360}, 65%, 55%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 800, fontSize: "1rem", flexShrink: 0
                }}>
                  {emp.fullName?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: "120px" }}>
                  <div style={{ fontWeight: 700, fontSize: "1rem" }}>{emp.fullName}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>{emp.role} · {emp.employeeId}</div>
                </div>
                <div className="emp-stats-col" style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>{emp.count}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "2px" }}>Bookings</div>
                </div>
                <div className="emp-stats-col" style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--success)", lineHeight: 1 }}>₹{emp.revenue.toLocaleString()}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "2px" }}>Revenue</div>
                </div>
              </div>

              {/* Bar for this employee vs max */}
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                  <span>Bookings share</span>
                  <span>{emp.count > 0 ? Math.round((emp.count / maxEmpCount) * 100) : 0}% of top</span>
                </div>
                <div style={{ height: 8, background: "var(--bg-tertiary)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${(emp.count / maxEmpCount) * 100}%`,
                    background: `linear-gradient(90deg, hsl(${(idx * 47) % 360}, 65%, 55%), hsl(${(idx * 47 + 40) % 360}, 65%, 60%))`,
                    borderRadius: "99px", transition: "width 0.6s ease"
                  }} />
                </div>
              </div>

              {/* Mini booking table for employee */}
              {emp.bookings.length > 0 ? (
                <div className="table-wrapper">
                  <table className="table-custom" style={{ fontSize: "0.82rem" }}>
                    <thead>
                      <tr>
                        <th>Booking ID</th>
                        <th>Customer</th>
                        <th>Phone</th>
                        <th>Room</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Amount</th>
                        <th>Pay Status</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emp.bookings.map(b => {
                        const sc = statusColor(b.bookingStatus);
                        const pc = payColor(b.paymentStatus);
                        return (
                          <tr key={b.bookingId}>
                            <td style={{ fontFamily: "monospace", color: "var(--primary)" }}>{b.bookingId}</td>
                            <td style={{ fontWeight: 600 }}>{b.customerName}</td>
                            <td style={{ color: "var(--text-secondary)" }}>{b.customerPhone}</td>
                            <td>#{b.roomNumber} <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "capitalize" }}>({b.roomType})</span></td>
                            <td>{b.checkInDate}</td>
                            <td>{b.checkOutDate}</td>
                            <td style={{ fontWeight: 700, color: "var(--success)" }}>₹{b.totalAmount?.toLocaleString()}</td>
                            <td><span style={{ ...pc, padding: "2px 8px", borderRadius: "99px", fontSize: "0.72rem", fontWeight: 700, textTransform: "capitalize" }}>{b.paymentStatus}</span></td>
                            <td><span style={{ ...sc, padding: "2px 8px", borderRadius: "99px", fontSize: "0.72rem", fontWeight: 700, textTransform: "capitalize" }}>{b.bookingStatus}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "1rem 0" }}>No bookings registered by this employee.</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── SECTION: REVENUE CHART ── */}
      {activeSection === "revenue" && (
        <div className="grid-form-2col" style={{ gap: "1.25rem" }}>

          {/* Revenue by Room Type - Horizontal Bars */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <BarChart3 size={17} style={{ color: "var(--primary)" }} /> Revenue by Room Type
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              {revenueByRoomType.map((rt, i) => {
                const pct = Math.round((rt.value / maxRevenue) * 100);
                return (
                  <div key={rt.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "5px" }}>
                      <span style={{ fontWeight: 600 }}>{rt.name}</span>
                      <strong style={{ color: "var(--success)" }}>₹{rt.value.toLocaleString()}</strong>
                    </div>
                    <div style={{ height: 10, background: "var(--bg-tertiary)", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, hsl(${(i * 60 + 210) % 360}, 70%, 55%), hsl(${(i * 60 + 250) % 360}, 70%, 60%))`,
                        borderRadius: "99px", transition: "width 0.6s ease"
                      }} />
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 3 }}>{pct}% of total revenue</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Booking status breakdown */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <CalendarDays size={17} style={{ color: "var(--primary)" }} /> Booking Status Breakdown
            </div>
            {["confirmed","checked-in","checked-out","pending","cancelled"].map(status => {
              const count = bookings.filter(b => b.bookingStatus === status).length;
              const pct   = bookings.length > 0 ? Math.round((count / bookings.length) * 100) : 0;
              const sc    = statusColor(status);
              return (
                <div key={status} style={{ marginBottom: "1.1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "5px" }}>
                    <span style={{ fontWeight: 600, textTransform: "capitalize", color: sc.color }}>{status}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 10, background: "var(--bg-tertiary)", borderRadius: "99px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: sc.color, borderRadius: "99px", transition: "width 0.6s ease", opacity: 0.85 }} />
                  </div>
                </div>
              );
            })}

            <div style={{ borderTop: "1px solid var(--card-border)", paddingTop: "1rem", marginTop: "0.5rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.75rem" }}>Revenue Summary</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Gross Revenue</span>
                  <strong style={{ color: "var(--success)" }}>₹{totalRevenue.toLocaleString()}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Avg. per Booking</span>
                  <strong>₹{totalBookings > 0 ? Math.round(totalRevenue / totalBookings).toLocaleString() : 0}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Total Bookings</span>
                  <strong>{totalBookings}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;
