"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../lib/auth";
import { BookingsService, BookingDetailModal } from "../../../features/bookings";
import { SettingsService } from "../../../features/settings";
import { EmployeesService } from "../../../features/employees";
import {
  ReportsStatsCards,
  BookingDetailsTab,
  EmployeeReportTab,
  RevenueChartTab
} from "../../../features/reports";
import { formatDate } from "../../../lib/db";
import {
  Download,
  BarChart3,
  Users,
  FileText
} from "lucide-react";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { Booking, RoomType, Employee } from "../../../types";

const bookingsService = new BookingsService();
const settingsService = new SettingsService();
const employeesService = new EmployeesService();

const statusColor = (status: string) => {
  switch (status) {
    case "confirmed":   return { backgroundColor: "var(--success-glow)", color: "var(--success)" };
    case "checked-in":  return { backgroundColor: "rgba(59,130,246,0.12)", color: "var(--primary)" };
    case "checked-out": return { backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" };
    case "cancelled":   return { backgroundColor: "var(--danger-glow)", color: "var(--danger)" };
    case "pending":     return { backgroundColor: "var(--warning-glow)", color: "var(--warning)" };
    default:            return { backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" };
  }
};

const payColor = (status: string) => {
  switch (status) {
    case "paid":     return { backgroundColor: "var(--success-glow)", color: "var(--success)" };
    case "partial":  return { backgroundColor: "var(--warning-glow)", color: "var(--warning)" };
    case "partially-paid": return { backgroundColor: "var(--warning-glow)", color: "var(--warning)" };
    case "unpaid":   return { backgroundColor: "var(--danger-glow)", color: "var(--danger)" };
    default:         return { backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" };
  }
};

const ReportsContent = () => {
  const { user } = useAuth();
  
  // Data States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState("bookings");
  
  // Booking Detail Modal State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isBookingDetailOpen, setIsBookingDetailOpen] = useState(false);

  // Search/Filter states inside Bookings Details Tab
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterEmployee, setFilterEmployee] = useState("all");

  const initialLoad = async () => {
    try {
      setLoading(true);
      const [bList, rtList, empList] = await Promise.all([
        bookingsService.getBookings(),
        settingsService.getRoomTypes(),
        employeesService.getEmployees()
      ]);
      setBookings(bList.data);
      setRoomTypes(rtList);
      setEmployees(empList);
    } catch (err) {
      console.error("Failed to load reports datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initialLoad();
  }, []);

  // Date Filter States
  const currentYear = new Date().getFullYear().toString();
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState(currentYear);

  // Dynamic available years based on bookings
  const availableYears = Array.from(new Set(bookings.map(b => new Date(b.checkInDate).getFullYear().toString()))).sort((a,b)=>b.localeCompare(a));
  if (availableYears.length === 0) availableYears.push(currentYear);
  else if (!availableYears.includes(currentYear)) availableYears.push(currentYear);

  // Apply Global Date Filter
  const dateFilteredBookings = bookings.filter(b => {
    if (filterMonth === "all" && filterYear === "all") return true;
    const checkIn = new Date(b.checkInDate);
    const m = (checkIn.getMonth() + 1).toString().padStart(2, "0");
    const y = checkIn.getFullYear().toString();
    if (filterMonth !== "all" && m !== filterMonth) return false;
    if (filterYear !== "all" && y !== filterYear) return false;
    return true;
  });

  // Summary Metrics calculations
  const totalBookings = dateFilteredBookings.length;
  const confirmedCount = dateFilteredBookings.filter(b => b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in").length;
  const cancelledCount = dateFilteredBookings.filter(b => b.bookingStatus === "cancelled").length;
  
  // Calculate total revenue from active (paid/partial) transactions
  const totalRevenue = dateFilteredBookings
    .filter(b => b.bookingStatus !== "cancelled")
    .reduce((acc, b) => {
      const amount = b.paymentStatus === "paid" ? b.totalAmount : (b.advanceAmount || 0);
      return acc + Number(amount);
    }, 0);

  // CSV Exporter Action helper
  const handleExportCSV = () => {
    if (dateFilteredBookings.length === 0) {
      alert("No data available to export for this selected timeframe.");
      return;
    }
    
    const headers = ["Booking ID", "Customer Name", "Phone", "Email", "Room Type", "Room Number", "Check In", "Check Out", "Total Price", "Advance Paid", "Status", "Payment", "Created By"];
    const rows = dateFilteredBookings.map(b => [
      b.bookingId,
      b.customerName,
      b.customerPhone,
      b.customerEmail,
      b.roomType,
      b.roomNumber,
      b.checkInDate,
      b.checkOutDate,
      b.totalAmount,
      b.advanceAmount,
      b.bookingStatus,
      b.paymentStatus,
      b.createdByName || "System"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const timeFrame = `${filterMonth !== "all" ? filterMonth + "-" : ""}${filterYear !== "all" ? filterYear : "all-time"}`;
    link.setAttribute("download", `brookvalley_hms_report_${timeFrame}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter list data for BookingDetails Tab
  const filteredBookings = dateFilteredBookings.filter(b => {
    const matchStatus = filterStatus === "all" || b.bookingStatus === filterStatus;
    const matchEmp = filterEmployee === "all" || b.createdByUid === filterEmployee;
    
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchStatus && matchEmp;

    const matchQuery = 
      b.bookingId.toLowerCase().includes(query) ||
      b.customerName.toLowerCase().includes(query) ||
      b.customerPhone.includes(query) ||
      (b.roomNumber && b.roomNumber.toLowerCase().includes(query));

    return matchStatus && matchEmp && matchQuery;
  });

  // Calculate Revenue contribution by room type
  const roomTypeRevenue = roomTypes.map(rt => {
    const typeRevenue = dateFilteredBookings
      .filter(b => b.roomType === rt.id && b.bookingStatus !== "cancelled")
      .reduce((acc, b) => acc + (b.advanceAmount || 0), 0);
    return {
      typeId: rt.id,
      name: rt.name,
      revenue: typeRevenue
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const maxRevenue = roomTypeRevenue.length > 0 ? roomTypeRevenue[0].revenue : 0;

  // Calculate Employee performance metrics
  const employeePerformance = employees.map(emp => {
    const empBookings = dateFilteredBookings.filter(b => b.createdByUid === emp.uid);
    const empRevenue = empBookings
      .filter(b => b.bookingStatus !== "cancelled")
      .reduce((acc, b) => acc + (b.advanceAmount || 0), 0);

    return {
      empId: emp.employeeId,
      name: emp.fullName,
      role: emp.role,
      bookingsCreated: empBookings.length,
      totalRevenueValue: empRevenue
    };
  }).sort((a, b) => b.totalRevenueValue - a.totalRevenueValue);

  const tabs = [
    { id: "bookings", label: "Booking Records", icon: <FileText size={16} /> },
    { id: "revenue",  label: "Revenue Contribution", icon: <BarChart3 size={16} /> }
  ];

  if (user?.role === "admin") {
    tabs.push({ id: "employees", label: "Employee Contribution", icon: <Users size={16} /> });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Reports & Analytics</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Track revenue performance, room type contributions, and employee metrics.
          </p>
        </div>

        <div className="header-actions">
          <select 
            className="input-control" 
            style={{ width: "auto", margin: 0, padding: "0.5rem 1rem", minHeight: "auto", borderRadius: "999px" }} 
            value={filterMonth} 
            onChange={e => setFilterMonth(e.target.value)}
          >
            <option value="all">All Months</option>
            <option value="01">January</option>
            <option value="02">February</option>
            <option value="03">March</option>
            <option value="04">April</option>
            <option value="05">May</option>
            <option value="06">June</option>
            <option value="07">July</option>
            <option value="08">August</option>
            <option value="09">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>

          <select 
            className="input-control" 
            style={{ width: "auto", margin: 0, padding: "0.5rem 1rem", minHeight: "auto", borderRadius: "999px" }} 
            value={filterYear} 
            onChange={e => setFilterYear(e.target.value)}
          >
            <option value="all">All Years</option>
            {availableYears.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>

          <button className="btn btn-primary" onClick={handleExportCSV} style={{ display: "flex", alignItems: "center", gap: "0.5rem", boxShadow: "var(--shadow-sm)" }}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
          Loading reports workspace...
        </div>
      ) : (
        <>
          {/* Key Metric Stats Cards */}
          <ReportsStatsCards 
            totalBookings={totalBookings}
            confirmedCount={confirmedCount}
            cancelledCount={cancelledCount}
            totalRevenue={totalRevenue}
          />

          {/* Sub Navigation Tabs */}
          <div className="pill-tabs-container">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.5rem 1.25rem", borderRadius: "99px", border: "none", cursor: "pointer",
                fontSize: "0.875rem", fontWeight: 600, transition: "all 0.2s ease",
                background: activeTab === tab.id ? "var(--primary)" : "transparent",
                color: activeTab === tab.id ? "#fff" : "var(--text-secondary)",
                boxShadow: activeTab === tab.id ? "0 2px 8px rgba(59,130,246,0.3)" : "none"
              }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab views switcher */}
          {activeTab === "bookings" && (
            <BookingDetailsTab 
              bookings={filteredBookings}
              employees={employees}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterEmployee={filterEmployee}
              setFilterEmployee={setFilterEmployee}
              isAdmin={user?.role === "admin"}
              formatDate={formatDate}
              statusColor={statusColor}
              payColor={payColor}
              onBookingClick={(booking) => {
                setSelectedBooking(booking);
                setIsBookingDetailOpen(true);
              }}
            />
          )}

          {activeTab === "revenue" && (
            <RevenueChartTab 
              roomTypeRevenue={roomTypeRevenue}
              maxRevenue={maxRevenue}
            />
          )}

          {activeTab === "employees" && user?.role === "admin" && (
            <EmployeeReportTab 
              performance={employeePerformance}
            />
          )}
        </>
      )}

      {/* Booking Detail Modal Overlay */}
      <BookingDetailModal 
        isOpen={isBookingDetailOpen}
        booking={selectedBooking}
        roomTypes={roomTypes}
        user={user}
        onClose={() => setIsBookingDetailOpen(false)}
        formatDate={formatDate}
      />
    </div>
  );
};

export default function ReportsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "employee"]}>
      <ReportsContent />
    </ProtectedRoute>
  );
}
