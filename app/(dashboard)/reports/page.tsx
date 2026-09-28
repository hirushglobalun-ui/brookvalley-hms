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
  FileText,
  Calendar,
  X,
  Wallet
} from "lucide-react";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { Booking, Room, RoomType, Employee } from "../../../types";
import { Skeleton, SkeletonTable } from "../../../components/ui/Skeleton";
import { matchRoomNumber } from "../../../lib/roomUtils";

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
  const [rooms, setRooms] = useState<Room[]>([]);
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
      const [bList, rtList, empList, rList] = await Promise.all([
        bookingsService.getBookings(),
        settingsService.getRoomTypes(),
        employeesService.getEmployees(),
        settingsService.getRooms()
      ]);
      setBookings(bList.data);
      setRoomTypes(rtList);
      setEmployees(empList);
      setRooms(rList);
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
  const [filterYear, setFilterYear] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"stay" | "checkin">("stay");
  const [filterRoomType, setFilterRoomType] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [onlyPending, setOnlyPending] = useState(false);

  // Dynamic available years based on bookings and multi-year range
  const availableYears = Array.from(
    new Set([
      "2024", "2025", "2026", "2027", "2028", "2029", "2030",
      ...bookings.map(b => {
        const y = new Date(b.checkInDate).getFullYear();
        return isNaN(y) ? "" : y.toString();
      }).filter(Boolean)
    ])
  ).sort((a, b) => b.localeCompare(a));

  const getRoomForNumber = (rNum: string) => {
    return rooms.find(r => matchRoomNumber(rNum, r.roomNumber));
  };

  // Apply Global Filters (Date and Room Type)
  const dateFilteredBookings = bookings.filter(b => {
    const rNums = b.roomNumber ? b.roomNumber.split(",").map(r => r.trim()).filter(Boolean) : [];
    const matchRoomType = filterRoomType === "all" || b.roomType === filterRoomType || rNums.some(rNum => {
      const roomObj = getRoomForNumber(rNum);
      return roomObj?.roomType === filterRoomType;
    });
    if (!matchRoomType) return false;

    // Specific Date Filter (e.g. 8th of a month)
    if (filterDate) {
      if (dateFilterType === "stay") {
        // Active staying on that date: check-in on or before, check-out on or after
        const isStaying = b.checkInDate <= filterDate && b.checkOutDate >= filterDate;
        if (!isStaying) return false;
      } else {
        if (b.checkInDate !== filterDate) return false;
      }
    } else {
      if (filterMonth === "all" && filterYear === "all") return true;
      const checkIn = new Date(b.checkInDate);
      const m = (checkIn.getMonth() + 1).toString().padStart(2, "0");
      const y = checkIn.getFullYear().toString();
      if (filterMonth !== "all" && m !== filterMonth) return false;
      if (filterYear !== "all" && y !== filterYear) return false;
    }
    return true;
  });

  // Summary Metrics calculations (matching user's exact requested 5 metrics)
  const totalBookings = dateFilteredBookings.length;
  const confirmedCount = dateFilteredBookings.filter(b => b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in").length;
  const cancelledCount = dateFilteredBookings.filter(b => b.bookingStatus === "cancelled").length;
  
  // 1. Total Booking Amount (Gross total value)
  const totalGrossRevenue = dateFilteredBookings
    .filter(b => b.bookingStatus !== "cancelled")
    .reduce((acc, b) => acc + Number(b.totalAmount || 0), 0);

  // 2. Agency Commission (Total given to agencies)
  const totalAgencyCommission = dateFilteredBookings
    .filter(b => b.bookingStatus !== "cancelled" && b.bookingSource === "agency")
    .reduce((acc, b) => acc + Number(b.agencyCommission || 0), 0);

  // 3. Net Hotel Total (Total - Agency Commission)
  const totalNetRevenue = totalGrossRevenue - totalAgencyCommission;

  // 4. Advance Received (Collected amount so far for the hotel)
  const totalAdvanceReceived = dateFilteredBookings
    .filter(b => b.bookingStatus !== "cancelled")
    .reduce((acc, b) => {
      const comm = b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0;
      const net = Number(b.totalAmount || 0) - comm;
      const collected = b.paymentStatus === "paid" ? net : Number(b.advanceAmount || 0);
      return acc + collected;
    }, 0);

  // 5. Total Pending Balance Due (Remaining to be collected based on Net Hotel Revenue)
  const totalPendingBalance = dateFilteredBookings
    .filter(b => b.bookingStatus !== "cancelled")
    .reduce((acc, b) => {
      const comm = b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0;
      const net = Number(b.totalAmount || 0) - comm;
      const collected = b.paymentStatus === "paid" ? net : Number(b.advanceAmount || 0);
      const balance = b.paymentStatus === "paid" ? 0 : Math.max(0, net - collected);
      return acc + balance;
    }, 0);

  // CSV Exporter Action helper
  const handleExportCSV = async () => {
    if (dateFilteredBookings.length === 0) {
      alert("No data available to export for this selected timeframe and property.");
      return;
    }
    
    const headers = [
      "Booking ID", "Customer Name", "Phone", "Email", 
      "Room Type", "Room Number", "Check In", "Check Out", 
      "Status", "Payment", "Source", "Agent Name", 
      "Agency / Company", "Agent Phone", "Agent Address", 
      "Gross Booking Price (₹)", "Agency Commission (₹)", "Net Hotel Revenue (₹)", 
      "Advance Paid (₹)", "Balance Due (₹)", "Created By"
    ];

    const rows = dateFilteredBookings.map(b => {
      const roomNums = b.roomNumber ? b.roomNumber.split(",").map(r => r.trim()).filter(Boolean) : [];
      const resolvedRoomTypes = Array.from(new Set(
        roomNums.length > 0 
          ? roomNums.map(rNum => {
              const roomObj = getRoomForNumber(rNum);
              const rtObj = roomTypes.find(rt => rt.id === roomObj?.roomType) || roomTypes.find(rt => rt.id === b.roomType);
              return rtObj?.name || b.roomType;
            })
          : [(roomTypes.find(rt => rt.id === b.roomType)?.name || b.roomType)]
      )).join(", ");

      const gross = Number(b.totalAmount || 0);
      const commission = b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0;
      const netRevenue = gross - commission;
      const advance = b.paymentStatus === "paid" ? netRevenue : Number(b.advanceAmount || 0);
      const balanceDue = b.paymentStatus === "paid" ? 0 : Math.max(0, netRevenue - advance);

      return [
        b.bookingId,
        b.customerName,
        b.customerPhone,
        b.customerEmail || "—",
        resolvedRoomTypes,
        b.roomNumber,
        b.checkInDate,
        b.checkOutDate,
        b.bookingStatus,
        b.paymentStatus,
        b.bookingSource === "agency" ? "Agency" : "Direct",
        b.agentName || "—",
        b.agentCompany || "—",
        b.agentPhone || "—",
        b.agentAddress || "—",
        gross,
        commission,
        netRevenue,
        advance,
        balanceDue,
        b.createdByName || "System"
      ];
    });

    const totalRow = [
      `TOTAL (${dateFilteredBookings.length} Bookings)`,
      "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      totalGrossRevenue,
      -totalAgencyCommission,
      totalNetRevenue,
      totalAdvanceReceived,
      totalPendingBalance,
      ""
    ];

    // Separate Pending Dues Section in the exported Google Sheet / CSV
    const pendingBookings = dateFilteredBookings.filter(b => {
      if (b.bookingStatus === "cancelled" || b.paymentStatus === "paid") return false;
      const comm = b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0;
      const net = Number(b.totalAmount || 0) - comm;
      const advance = Number(b.advanceAmount || 0);
      return (net - advance) > 0;
    });

    const pendingSectionHeader: (string | number)[][] = [
      [],
      [],
      ["PENDING BALANCE DUE BREAKDOWN "],
      [`Total Pending Amount (₹): ${totalPendingBalance}`, `Pending Bookings Count: ${pendingBookings.length}`],
      []
    ];

    const pendingHeaders = [
      "Booking ID", "Customer Name", "Phone", "Email", 
      "Room Type", "Room Number", "Check In", "Check Out", 
      "Status", "Payment", "Source", "Agent Name", 
      "Agency / Company", "Agent Phone", "Agent Address", 
      "Gross Booking Price (₹)", "Agency Commission (₹)", "Net Hotel Revenue (₹)", 
      "Advance Paid (₹)", "Balance Due (₹)", "Created By"
    ];

    const pendingRows = pendingBookings.map(b => {
      const roomNums = b.roomNumber ? b.roomNumber.split(",").map(r => r.trim()).filter(Boolean) : [];
      const resolvedRoomTypes = Array.from(new Set(
        roomNums.length > 0 
          ? roomNums.map(rNum => {
              const roomObj = getRoomForNumber(rNum);
              const rtObj = roomTypes.find(rt => rt.id === roomObj?.roomType) || roomTypes.find(rt => rt.id === b.roomType);
              return rtObj?.name || b.roomType;
            })
          : [(roomTypes.find(rt => rt.id === b.roomType)?.name || b.roomType)]
      )).join(", ");

      const gross = Number(b.totalAmount || 0);
      const commission = b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0;
      const netRevenue = gross - commission;
      const advance = Number(b.advanceAmount || 0);
      const balanceDue = Math.max(0, netRevenue - advance);

      return [
        b.bookingId,
        b.customerName,
        b.customerPhone,
        b.customerEmail || "—",
        resolvedRoomTypes,
        b.roomNumber,
        b.checkInDate,
        b.checkOutDate,
        b.bookingStatus,
        b.paymentStatus,
        b.bookingSource === "agency" ? "Agency" : "Direct",
        b.agentName || "—",
        b.agentCompany || "—",
        b.agentPhone || "—",
        b.agentAddress || "—",
        gross,
        commission,
        netRevenue,
        advance,
        balanceDue,
        b.createdByName || "System"
      ];
    });

    const pendingTotalRow = [
      `TOTAL PENDING (${pendingBookings.length} Bookings)`,
      "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      pendingBookings.reduce((s, b) => s + Number(b.totalAmount || 0), 0),
      -pendingBookings.reduce((s, b) => s + (b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0), 0),
      pendingBookings.reduce((s, b) => s + (Number(b.totalAmount || 0) - (b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0)), 0),
      pendingBookings.reduce((s, b) => s + Number(b.advanceAmount || 0), 0),
      totalPendingBalance,
      ""
    ];

    const allCsvData: (string | number)[][] = [
      headers,
      ...rows,
      totalRow,
      ...pendingSectionHeader,
      pendingHeaders,
      ...pendingRows,
      pendingTotalRow
    ];

    const csvBody = allCsvData
      .map(e => e.map(val => `"${String(val !== undefined && val !== null ? val : "").replace(/"/g, '""')}"`).join(","))
      .join("\r\n");

    const timeFrame = filterDate 
      ? `day_${filterDate}` 
      : `${filterMonth !== "all" ? filterMonth + "-" : ""}${filterYear !== "all" ? filterYear : "all-time"}`;
    const fileName = `brookvalley_hms_report_${timeFrame}.csv`;

    const blob = new Blob(["\uFEFF" + csvBody], { type: "text/csv;charset=utf-8;" });

    // iOS Safari / Mobile Native Share (Allows "Save to Files", Numbers, AirDrop, etc.)
    if (typeof navigator !== "undefined" && navigator.canShare) {
      try {
        const file = new File([blob], fileName, { type: "text/csv" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: fileName,
          });
          return;
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return; // User cancelled share sheet
        console.warn("Share failed, falling back to blob download:", err);
      }
    }

    // Standard Blob URL download fallback
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 150);
  };

  // Filter list data for BookingDetails Tab
  const filteredBookings = dateFilteredBookings.filter(b => {
    const matchStatus = filterStatus === "all" || b.bookingStatus === filterStatus;
    const matchEmp = filterEmployee === "all" || b.createdByUid === filterEmployee;
    const matchSource = filterSource === "all" || (filterSource === "agency" ? b.bookingSource === "agency" : b.bookingSource !== "agency");

    const gross = Number(b.totalAmount || 0);
    const comm = b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0;
    const net = gross - comm;
    const advance = b.paymentStatus === "paid" ? net : Number(b.advanceAmount || 0);
    const pendingBalance = b.paymentStatus === "paid" ? 0 : Math.max(0, net - advance);
    if (onlyPending && pendingBalance <= 0) return false;
    
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchStatus && matchEmp && matchSource;

    const matchQuery = 
      b.bookingId.toLowerCase().includes(query) ||
      b.customerName.toLowerCase().includes(query) ||
      b.customerPhone.includes(query) ||
      (b.agentName && b.agentName.toLowerCase().includes(query)) ||
      (b.agentCompany && b.agentCompany.toLowerCase().includes(query)) ||
      (b.roomNumber && b.roomNumber.toLowerCase().includes(query));

    return matchStatus && matchEmp && matchSource && matchQuery;
  });

  // Calculate Revenue contribution by room type & per room with proportional multi-room allocation
  const roomTypeRevenueMap: Record<string, { gross: number; revenue: number; commission: number; advance: number; count: number }> = {};
  const roomRevenueMap: Record<string, { roomNumber: string; roomTypeId: string; roomTypeName: string; gross: number; revenue: number; commission: number; advance: number; count: number }> = {};

  roomTypes.forEach(rt => {
    roomTypeRevenueMap[rt.id] = { gross: 0, revenue: 0, commission: 0, advance: 0, count: 0 };
  });

  rooms.forEach(r => {
    const rtObj = roomTypes.find(rt => rt.id === r.roomType);
    roomRevenueMap[r.roomNumber] = {
      roomNumber: r.roomNumber,
      roomTypeId: r.roomType,
      roomTypeName: rtObj?.name || r.roomType,
      gross: 0,
      revenue: 0,
      commission: 0,
      advance: 0,
      count: 0
    };
  });

  dateFilteredBookings.forEach(b => {
    if (b.bookingStatus === "cancelled") return;

    const rNums = b.roomNumber ? b.roomNumber.split(",").map(r => r.trim()).filter(Boolean) : [];
    
    // Amount collected so far for this booking (Total amount if paid, or advance amount if unpaid/partial)
    const amountCollected = b.paymentStatus === "paid" ? Number(b.totalAmount || 0) : Number(b.advanceAmount || 0);
    const advancePaid = Number(b.advanceAmount || 0);
    const totalCommission = Number(b.agencyCommission || 0);
    const netRevenue = amountCollected - totalCommission;

    if (rNums.length === 0) {
      const rtId = b.roomType;
      if (roomTypeRevenueMap[rtId]) {
        roomTypeRevenueMap[rtId].gross += amountCollected;
        roomTypeRevenueMap[rtId].revenue += netRevenue;
        roomTypeRevenueMap[rtId].commission += totalCommission;
        roomTypeRevenueMap[rtId].advance += advancePaid;
        roomTypeRevenueMap[rtId].count += 1;
      }
      return;
    }

    // Determine weight of each room in the booking
    const roomDetails = rNums.map(rNum => {
      const roomObj = getRoomForNumber(rNum);
      const rtId = roomObj?.roomType || b.roomType;
      const rtObj = roomTypes.find(rt => rt.id === rtId);
      const basePrice = rtObj?.price || 1;
      return { rNum, roomObj, rtId, basePrice };
    });

    const totalBasePrice = roomDetails.reduce((sum, rd) => sum + Number(rd.basePrice || 1), 0);

    roomDetails.forEach(rd => {
      const share = totalBasePrice > 0 ? (Number(rd.basePrice || 1) / totalBasePrice) : (1 / roomDetails.length);
      
      const shareGross = amountCollected * share;
      const shareNet = netRevenue * share;
      const shareCommission = totalCommission * share;
      const shareAdvance = advancePaid * share;

      // Accumulate into Room Type map
      if (!roomTypeRevenueMap[rd.rtId]) {
        const rtObj = roomTypes.find(rt => rt.id === rd.rtId);
        roomTypeRevenueMap[rd.rtId] = { gross: 0, revenue: 0, commission: 0, advance: 0, count: 0 };
      }
      roomTypeRevenueMap[rd.rtId].gross += shareGross;
      roomTypeRevenueMap[rd.rtId].revenue += shareNet;
      roomTypeRevenueMap[rd.rtId].commission += shareCommission;
      roomTypeRevenueMap[rd.rtId].advance += shareAdvance;
      roomTypeRevenueMap[rd.rtId].count += 1;

      // Accumulate into Individual Room map
      const matchedRoomNum = rd.roomObj?.roomNumber || rd.rNum;
      if (!roomRevenueMap[matchedRoomNum]) {
        const rtObj = roomTypes.find(rt => rt.id === rd.rtId);
        roomRevenueMap[matchedRoomNum] = {
          roomNumber: matchedRoomNum,
          roomTypeId: rd.rtId,
          roomTypeName: rtObj?.name || rd.rtId,
          gross: 0,
          revenue: 0,
          commission: 0,
          advance: 0,
          count: 0
        };
      }
      roomRevenueMap[matchedRoomNum].gross += shareGross;
      roomRevenueMap[matchedRoomNum].revenue += shareNet;
      roomRevenueMap[matchedRoomNum].commission += shareCommission;
      roomRevenueMap[matchedRoomNum].advance += shareAdvance;
      roomRevenueMap[matchedRoomNum].count += 1;
    });
  });

  const activeRoomTypes = filterRoomType === "all" ? roomTypes : roomTypes.filter(rt => rt.id === filterRoomType);
  const roomTypeRevenue = activeRoomTypes.map(rt => {
    const data = roomTypeRevenueMap[rt.id] || { gross: 0, revenue: 0, commission: 0, advance: 0, count: 0 };
    return {
      typeId: rt.id,
      name: rt.name,
      gross: Math.round(data.gross),
      revenue: Math.round(data.revenue),
      commission: Math.round(data.commission),
      advance: Math.round(data.advance),
      count: data.count
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const roomRevenueList = Object.values(roomRevenueMap)
    .filter(r => filterRoomType === "all" || r.roomTypeId === filterRoomType)
    .map(r => ({
      ...r,
      gross: Math.round(r.gross),
      revenue: Math.round(r.revenue),
      commission: Math.round(r.commission),
      advance: Math.round(r.advance)
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const maxRevenue = roomTypeRevenue.length > 0 ? Math.max(...roomTypeRevenue.map(r => r.revenue)) : 0;

  // Calculate Employee performance metrics
  const employeePerformance = employees.map(emp => {
    let empCommission = 0;
    let empGross = 0;
    const empBookings = dateFilteredBookings.filter(b => b.createdByUid === emp.uid);
    const empRevenue = empBookings
      .filter(b => b.bookingStatus !== "cancelled")
      .reduce((acc, b) => {
        const amount = b.paymentStatus === "paid" ? b.totalAmount : (b.advanceAmount || 0);
        const commission = b.agencyCommission || 0;
        empCommission += Number(commission);
        empGross += Number(amount);
        return acc + (Number(amount) - Number(commission));
      }, 0);

    return {
      empId: emp.employeeId,
      name: emp.fullName,
      role: emp.role,
      bookingsCreated: empBookings.length,
      gross: empGross,
      totalRevenueValue: empRevenue,
      totalCommissionValue: empCommission
    };
  }).sort((a, b) => b.totalRevenueValue - a.totalRevenueValue);

  const pendingCount = dateFilteredBookings.filter(b => {
    if (b.bookingStatus === "cancelled" || b.paymentStatus === "paid") return false;
    const comm = b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0;
    const net = Number(b.totalAmount || 0) - comm;
    return (net - Number(b.advanceAmount || 0)) > 0;
  }).length;

  const tabs = [
    { id: "bookings", label: "Booking Records", icon: <FileText size={16} /> },
    { id: "pending",  label: `Pending Dues (${pendingCount})`, icon: <Wallet size={16} /> },
    { id: "revenue",  label: "Revenue Contribution", icon: <BarChart3 size={16} /> }
  ];

  if (user?.role === "admin" || user?.role === "developer" || user?.role === "manager") {
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

        <div className="header-actions" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          {/* Specific Day / Stay Date Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "var(--bg-secondary)", padding: "0.3rem 0.65rem", borderRadius: "999px", border: "1px solid var(--card-border)" }}>
            <Calendar size={14} style={{ color: "var(--text-secondary)" }} />
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>Day:</span>
            <input 
              type="date" 
              className="input-control" 
              style={{ width: "auto", margin: 0, padding: "0.15rem 0.4rem", minHeight: "auto", border: "none", background: "transparent", fontSize: "0.82rem", outline: "none" }}
              value={filterDate}
              onChange={e => {
                setFilterDate(e.target.value);
                if (e.target.value) {
                  setFilterMonth("all");
                  setFilterYear("all");
                }
              }}
            />
            {filterDate && (
              <>
                <button
                  type="button"
                  onClick={() => setFilterDate("")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", padding: "2px" }}
                  title="Clear Day Filter"
                >
                  <X size={14} />
                </button>
                <select
                  className="input-control"
                  style={{ width: "auto", margin: 0, padding: "0.15rem 0.5rem", minHeight: "auto", borderRadius: "6px", fontSize: "0.75rem", border: "1px solid var(--card-border)" }}
                  value={dateFilterType}
                  onChange={e => setDateFilterType(e.target.value as "stay" | "checkin")}
                >
                  <option value="stay">Staying on Date</option>
                  <option value="checkin">Check-In on Date</option>
                </select>
              </>
            )}
          </div>

          {!filterDate && (
            <>
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
            </>
          )}

          <select 
            className="input-control" 
            style={{ width: "auto", margin: 0, padding: "0.5rem 1rem", minHeight: "auto", borderRadius: "999px" }} 
            value={filterRoomType} 
            onChange={e => setFilterRoomType(e.target.value)}
          >
            <option value="all">All Properties/Rooms</option>
            {roomTypes.map(rt => (
              <option key={rt.id} value={rt.id}>{rt.name}</option>
            ))}
          </select>

          <button className="btn btn-primary" onClick={handleExportCSV} style={{ display: "flex", alignItems: "center", gap: "0.5rem", boxShadow: "var(--shadow-sm)" }}>
            <Download size={16} /> Report
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="grid-stats">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card stat-card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem" }}>
                <Skeleton width={44} height={44} borderRadius={12} />
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
                  <Skeleton width="50%" height={22} />
                  <Skeleton width="70%" height={12} />
                </div>
              </div>
            ))}
          </div>
          <SkeletonTable columns={5} rows={5} />
        </div>
      ) : (
        <>
          {/* Key Metric Stats Cards */}
          <ReportsStatsCards 
            totalBookings={totalBookings}
            confirmedCount={confirmedCount}
            cancelledCount={cancelledCount}
            totalGrossRevenue={totalGrossRevenue}
            totalAgencyCommission={totalAgencyCommission}
            totalNetRevenue={totalNetRevenue}
            totalAdvanceReceived={totalAdvanceReceived}
            totalPendingBalance={totalPendingBalance}
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
              rooms={rooms}
              roomTypes={roomTypes}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterEmployee={filterEmployee}
              setFilterEmployee={setFilterEmployee}
              filterSource={filterSource}
              setFilterSource={setFilterSource}
              onlyPending={onlyPending}
              setOnlyPending={setOnlyPending}
              isAdmin={user?.role === "admin" || user?.role === "developer" || user?.role === "manager"}
              formatDate={formatDate}
              statusColor={statusColor}
              payColor={payColor}
              onBookingClick={(booking) => {
                setSelectedBooking(booking);
                setIsBookingDetailOpen(true);
              }}
            />
          )}

          {activeTab === "pending" && (
            <BookingDetailsTab 
              bookings={dateFilteredBookings.filter(b => {
                if (b.bookingStatus === "cancelled" || b.paymentStatus === "paid") return false;
                const comm = b.bookingSource === "agency" ? Number(b.agencyCommission || 0) : 0;
                const net = Number(b.totalAmount || 0) - comm;
                const balance = Math.max(0, net - Number(b.advanceAmount || 0));
                if (balance <= 0) return false;

                const matchStatus = filterStatus === "all" || b.bookingStatus === filterStatus;
                const matchEmp = filterEmployee === "all" || b.createdByUid === filterEmployee;
                const matchSource = filterSource === "all" || (filterSource === "agency" ? b.bookingSource === "agency" : b.bookingSource !== "agency");

                const query = searchQuery.toLowerCase().trim();
                if (!query) return matchStatus && matchEmp && matchSource;

                const matchQuery = 
                  b.bookingId.toLowerCase().includes(query) ||
                  b.customerName.toLowerCase().includes(query) ||
                  b.customerPhone.includes(query) ||
                  (b.agentName && b.agentName.toLowerCase().includes(query)) ||
                  (b.agentCompany && b.agentCompany.toLowerCase().includes(query)) ||
                  (b.roomNumber && b.roomNumber.toLowerCase().includes(query));

                return matchStatus && matchEmp && matchSource && matchQuery;
              })}
              employees={employees}
              rooms={rooms}
              roomTypes={roomTypes}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterEmployee={filterEmployee}
              setFilterEmployee={setFilterEmployee}
              filterSource={filterSource}
              setFilterSource={setFilterSource}
              isAdmin={user?.role === "admin" || user?.role === "developer" || user?.role === "manager"}
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
              roomRevenueList={roomRevenueList}
              maxRevenue={maxRevenue}
            />
          )}

          {activeTab === "employees" && (user?.role === "admin" || user?.role === "developer" || user?.role === "manager") && (
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
        rooms={rooms}
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
    <ProtectedRoute allowedRoles={["admin", "manager"]}>
      <ReportsContent />
    </ProtectedRoute>
  );
}
