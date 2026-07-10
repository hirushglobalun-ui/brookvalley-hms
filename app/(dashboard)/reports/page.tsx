"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../lib/auth";
import { BookingsService } from "../../../features/bookings";
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

  // Summary Metrics calculations
  const totalBookings = bookings.length;
  const confirmedCount = bookings.filter(b => b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in").length;
  const cancelledCount = bookings.filter(b => b.bookingStatus === "cancelled").length;
  
  // Calculate total revenue from active (paid/partial) transactions
  const totalRevenue = bookings
    .filter(b => b.bookingStatus !== "cancelled")
    .reduce((acc, b) => acc + (b.advanceAmount || 0), 0);

  // CSV Exporter Action helper
  const handleExportCSV = () => {
    if (bookings.length === 0) return;
    
    const headers = ["Booking ID", "Customer Name", "Phone", "Email", "Room Type", "Room Number", "Check In", "Check Out", "Total Price", "Advance Paid", "Status", "Payment", "Created By"];
    const rows = bookings.map(b => [
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
    link.setAttribute("download", `brookvalley_hms_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter list data for BookingDetails Tab
  const filteredBookings = bookings.filter(b => {
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
    const typeRevenue = bookings
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
    const empBookings = bookings.filter(b => b.createdByUid === emp.uid);
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

        <button className="btn btn-secondary btn-icon" onClick={handleExportCSV}>
          <Download size={16} /> Export CSV
        </button>
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
          <div style={{ display: "flex", gap: "0.5rem", background: "var(--bg-secondary)", border: "1px solid var(--card-border)", borderRadius: "99px", padding: "0.35rem", width: "fit-content" }}>
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
