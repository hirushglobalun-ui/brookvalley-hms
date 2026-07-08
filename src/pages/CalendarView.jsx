import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../firebase/auth";
import { getBookings, getRooms, getRoomTypes, addBooking } from "../firebase/db";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Eye, 
  Lock,
  X,
  Info,
  Calendar,
  AlertCircle
} from "lucide-react";

const CalendarView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Selected date context
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Data States
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Details Modal
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [clickedDayInfo, setClickedDayInfo] = useState(null);

  // Booking Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedRoomType, setSelectedRoomType] = useState("");
  const [selectedRoomNumbers, setSelectedRoomNumbers] = useState([]);
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [bookingStatus, setBookingStatus] = useState("confirmed");
  const [paymentMethod, setPaymentMethod] = useState("none");
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [paymentProof, setPaymentProof] = useState("");
  const [remarks, setRemarks] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [bData, rData, rtData] = await Promise.all([
          getBookings(),
          getRooms(),
          getRoomTypes()
        ]);
        setBookings(bData);
        setRooms(rData);
        setRoomTypes(rtData);
      } catch (err) {
        console.error("Calendar load error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
 
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
 
  const handleToday = () => {
    setCurrentDate(new Date());
  };
  // Auto assign room number based on room type selection and check-in / check-out dates
  const autoAssignRoom = (roomTypeId, checkIn, checkOut, currentBookingId = null) => {
    const candidateRooms = rooms.filter(r => r.roomType === roomTypeId);
    if (candidateRooms.length === 0) {
      return { success: false, error: "No rooms configured for this room type." };
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return { success: false, error: "Invalid check-in or check-out date." };
    }

    // Since each roomType has strictly 1 room, check the first candidate
    const room = candidateRooms[0];
    const conflict = bookings.find(b => {
      const activeStatuses = ["confirmed", "pending", "checked-in"];
      if (!activeStatuses.includes(b.bookingStatus)) return false;
      if (currentBookingId && b.bookingId === currentBookingId) return false;
      
      const bookedRoomNumbers = b.roomNumber ? b.roomNumber.split(",").map(r => r.trim()) : [];
      if (!bookedRoomNumbers.includes(room.roomNumber)) return false;

      const bStart = new Date(b.checkInDate);
      const bEnd = new Date(b.checkOutDate);
      return (start < bEnd && end > bStart);
    });

    if (conflict) {
      const creator = conflict.createdByName || "System";
      const statusLabel = conflict.bookingStatus.charAt(0).toUpperCase() + conflict.bookingStatus.slice(1);
      return {
        success: false,
        error: `Already booked for ${conflict.customerName} (${statusLabel}) by ${creator}.`
      };
    }

    return { success: true, roomNumber: room.roomNumber };
  };

  // Reactive room availability check
  useEffect(() => {
    if (selectedRoomType && checkInDate && checkOutDate) {
      const result = autoAssignRoom(selectedRoomType, checkInDate, checkOutDate, selectedBooking?.bookingId);
      if (!result.success) {
        setFormError(result.error);
      } else {
        setFormError(prev => {
          const isAutoAssignError = prev.startsWith("Already booked for") || 
                                    prev === "No rooms configured for this room type." ||
                                    prev === "Invalid check-in or check-out date.";
          return isAutoAssignError ? "" : prev;
        });
      }
    } else {
      setFormError(prev => {
        const isAutoAssignError = prev.startsWith("Already booked for") || 
                                  prev === "No rooms configured for this room type." ||
                                  prev === "Invalid check-in or check-out date.";
        return isAutoAssignError ? "" : prev;
      });
    }
  }, [selectedRoomType, checkInDate, checkOutDate, rooms, bookings, selectedBooking]);
  // Recalculate price dynamically based on room type selection, dates, and selected rooms
  useEffect(() => {
    if (selectedRoomType && checkInDate && checkOutDate) {
      const type = roomTypes.find(rt => rt.id === selectedRoomType);
      const price = type ? type.price : 0;
      
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
        const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
        const diffDays = Math.floor((utcEnd - utcStart) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
          const roomsCount = selectedRoomNumbers.length || 1;
          setTotalAmount(price * diffDays * roomsCount);
        } else {
          setTotalAmount(0);
        }
      } else {
        setTotalAmount(0);
      }
    } else {
      setTotalAmount(0);
    }
  }, [selectedRoomType, checkInDate, checkOutDate, roomTypes, selectedRoomNumbers]);



  // Helper to read uploaded files as Base64 strings
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert("File is too large. Please select an image under 800KB.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProof(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter available rooms of the selected type
  const getAvailableRoomsForStay = () => {
    if (!selectedRoomType || !checkInDate || !checkOutDate) return [];
    
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return [];
    
    const candidateRooms = rooms.filter(r => r.roomType === selectedRoomType);
    
    return candidateRooms.filter(room => {
      const isBooked = bookings.some(b => {
        const activeStatuses = ["confirmed", "pending", "checked-in"];
        if (!activeStatuses.includes(b.bookingStatus)) return false;
        
        const bookedRoomNumbers = b.roomNumber ? b.roomNumber.split(",").map(r => r.trim()) : [];
        if (!bookedRoomNumbers.includes(room.roomNumber)) return false;
        
        const bStart = new Date(b.checkInDate);
        const bEnd = new Date(b.checkOutDate);
        return (start < bEnd && end > bStart);
      });
      return !isBooked;
    });
  };

  // Open creation modal
  const handleOpenCreate = (prefillDate = "") => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerAddress("");
    setSelectedRoomType("");
    setSelectedRoomNumbers([]);
    setCheckInDate(prefillDate || "");
    
    if (prefillDate) {
      const parts = prefillDate.split("-");
      if (parts.length === 3) {
        const yr = parseInt(parts[0], 10);
        const mo = parseInt(parts[1], 10) - 1;
        const dy = parseInt(parts[2], 10);
        const checkIn = new Date(yr, mo, dy);
        checkIn.setDate(checkIn.getDate() + 1);
        
        const nextYear = checkIn.getFullYear();
        const nextMonth = String(checkIn.getMonth() + 1).padStart(2, '0');
        const nextDay = String(checkIn.getDate()).padStart(2, '0');
        setCheckOutDate(`${nextYear}-${nextMonth}-${nextDay}`);
      } else {
        setCheckOutDate("");
      }
    } else {
      setCheckOutDate("");
    }
    
    setGuestCount(1);
    setTotalAmount(0);
    setPaymentStatus("unpaid");
    setBookingStatus("confirmed");
    setPaymentMethod("none");
    setAdvanceAmount(0);
    setPaymentProof("");
    setRemarks("");
    setFormError("");
    setIsModalOpen(true);
  };

  // Submit Booking Form
  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    setFormError("");

    // Validate Phone: must be exactly 10 digits
    const cleanPhone = customerPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length !== 10) {
      setFormError("Customer phone number must be exactly 10 digits.");
      return;
    }
    
    if (new Date(checkInDate) >= new Date(checkOutDate)) {
      setFormError("Check-out date must be after check-in date.");
      return;
    }

    const result = autoAssignRoom(selectedRoomType, checkInDate, checkOutDate, selectedBooking?.bookingId);
    if (!result.success) {
      setFormError(result.error);
      return;
    }

    setFormLoading(true);
    try {
      const data = {
        customerName,
        customerPhone,
        customerEmail: customerEmail || "",
        customerAddress: customerAddress || "",
        roomType: selectedRoomType,
        roomNumber: result.roomNumber,
        checkInDate,
        checkOutDate,
        guestCount: Number(guestCount),
        totalAmount: Number(totalAmount),
        paymentStatus,
        bookingStatus,
        paymentMethod,
        advanceAmount: Number(advanceAmount),
        paymentProof,
        remarks
      };

      await addBooking(data, user);

      setIsModalOpen(false);
      
      // Refresh local bookings list
      const bData = await getBookings();
      setBookings(bData);
    } catch (err) {
      setFormError(err.message || "Failed to save booking.");
    } finally {
      setFormLoading(false);
    }
  };

  const getDayOfWeekLabel = (dayNum) => {
    const d = new Date(year, month, dayNum);
    return d.toLocaleDateString("en-US", { weekday: "narrow" });
  };

  const formatDateString = (dayNum) => {
    const d = new Date(year, month, dayNum);
    return d.toISOString().split("T")[0];
  };

  // Helper checks
  const isToday = (dayNum) => {
    const today = new Date();
    return today.getDate() === dayNum && today.getMonth() === month && today.getFullYear() === year;
  };

  const isOwner = (booking) => user.role === "admin" || booking.createdByUid === user.uid;

  // Filter bookings that intersect with this month
  const monthStartDate = new Date(year, month, 1);
  const monthEndDate = new Date(year, month, daysInMonth);

  const monthBookings = bookings.filter(b => {
    const checkIn = new Date(b.checkInDate);
    const checkOut = new Date(b.checkOutDate);
    return checkIn <= monthEndDate && checkOut >= monthStartDate && b.bookingStatus !== "cancelled";
  });

  const handleEmptyCellClick = (roomNumber, dayNum) => {
    const dateStr = formatDateString(dayNum);
    // Navigate to bookings page with query parameters to prefill creation drawer
    navigate(`/bookings?prefillRoom=${roomNumber}&prefillDate=${dateStr}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", height: "calc(100vh - 70px)" }}>
      
      {/* Unified Calendar Header */}
      <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
          
          {/* Left Block: Title & Month Navigation */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1, minWidth: "300px" }}>
            <div>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Room Booking Calendar</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                Visual occupancy timeline. Click empty cells to book, or occupied blocks to view details.
              </p>
            </div>

            {/* Month Navigation & Title */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button className="btn btn-secondary btn-icon" onClick={handlePrevMonth}>
                  <ChevronLeft size={16} />
                </button>
                <button className="btn btn-secondary" style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem" }} onClick={handleToday}>
                  Today
                </button>
                <button className="btn btn-secondary btn-icon" onClick={handleNextMonth}>
                  <ChevronRight size={16} />
                </button>
              </div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, textTransform: "capitalize", margin: 0 }}>
                {monthName} {year}
              </h2>
            </div>
          </div>

          {/* Right Block: Status Legends & Action */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "1rem", minWidth: "250px" }}>
            <button className="btn btn-primary" onClick={() => handleOpenCreate("")}>
              <Plus size={16} />
              <span>New Reservation</span>
            </button>

            <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#10b981", display: "inline-block" }} />
                <span>Confirmed</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#f59e0b", display: "inline-block" }} />
                <span>Pending</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#3b82f6", display: "inline-block" }} />
                <span>In</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#e2e8f0", border: "1px solid var(--card-border)", display: "inline-block" }} />
                <span>Other</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Month Calendar Grid Sheet */}
      <div className="card calendar-card" style={{ padding: "1.25rem", overflow: "hidden" }}>
        {loading ? (
          <div className="no-data">Loading calendar...</div>
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", backgroundColor: "var(--card-border)", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--card-border)" }}>
              {/* Weekday headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="calendar-weekday-header" style={{ backgroundColor: "var(--bg-secondary)", padding: "0.75rem", textAlign: "center", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)", borderBottom: "1px solid var(--card-border)" }}>
                  {day}
                </div>
              ))}
              {/* Cells */}
              {(() => {
                const firstDayIndex = new Date(year, month, 1).getDay();
                const prevMonthDaysCount = new Date(year, month, 0).getDate();
                const cells = [];
                
                // Front padding
                for (let i = firstDayIndex - 1; i >= 0; i--) {
                  cells.push({
                    dayNum: prevMonthDaysCount - i,
                    isCurrentMonth: false,
                    date: new Date(year, month - 1, prevMonthDaysCount - i)
                  });
                }
                
                // Current month
                for (let i = 1; i <= daysInMonth; i++) {
                  cells.push({
                    dayNum: i,
                    isCurrentMonth: true,
                    date: new Date(year, month, i)
                  });
                }
                
                // Back padding
                const totalCellsNeeded = cells.length <= 35 ? 35 : 42;
                const nextMonthDaysCount = totalCellsNeeded - cells.length;
                for (let i = 1; i <= nextMonthDaysCount; i++) {
                  cells.push({
                    dayNum: i,
                    isCurrentMonth: false,
                    date: new Date(year, month + 1, i)
                  });
                }

                const getBookingsForDate = (date) => {
                  const cellDate = new Date(date);
                  cellDate.setHours(0, 0, 0, 0);
                  
                  return bookings.filter(b => {
                    if (b.bookingStatus === "cancelled") return false;
                    const start = new Date(b.checkInDate);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(b.checkOutDate);
                    end.setHours(0, 0, 0, 0);
                    return cellDate >= start && cellDate < end;
                  });
                };

                return cells.map((cell, idx) => {
                  const dateStr = cell.date.toISOString().split("T")[0];
                  const cellBookings = getBookingsForDate(cell.date);
                  const cellIsToday = cell.date.toDateString() === new Date().toDateString();
                  
                  // Calculate dynamic cell background based on bookings (especially for mobile visual cues)
                  let cellBgColor = "";
                  if (cellBookings.length > 0) {
                    const firstBooking = cellBookings[0];
                    const status = firstBooking.bookingStatus;
                    const color = 
                      status === "checked-in" ? "rgba(59, 130, 246, 0.05)" :
                      status === "confirmed" ? "rgba(16, 185, 129, 0.05)" :
                      status === "pending" ? "rgba(245, 158, 11, 0.05)" : "";
                    cellBgColor = color;
                  }
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => setClickedDayInfo({ date: cell.date, bookings: cellBookings })}
                      className="calendar-cell"
                      style={{
                        opacity: cell.isCurrentMonth ? 1 : 0.4,
                        backgroundColor: cellBgColor || undefined
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-secondary)"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = cellBgColor || "var(--card-bg)"}
                    >
                      {/* Cell Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span 
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            fontSize: "0.85rem",
                            fontWeight: cellIsToday || cell.isCurrentMonth ? 600 : 400,
                            backgroundColor: cellIsToday ? "var(--primary)" : "transparent",
                            color: cellIsToday ? "#ffffff" : "var(--text-primary)"
                          }}
                        >
                          {cell.dayNum}
                        </span>
                        
                        {/* Plus button to add booking */}
                        <button
                          type="button"
                          className="calendar-cell-add-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCreate(dateStr);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px",
                            color: "var(--primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                          title="Add Booking for this day"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Cell Bookings list (Desktop/Tablet) */}
                      <div className="calendar-booking-bar-wrapper" style={{ display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto", flexGrow: 1, maxHeight: "80px" }}>
                        {cellBookings.slice(0, 3).map((b, bIdx) => {
                          const owner = isOwner(b);
                          const statusColor = 
                            b.bookingStatus === "checked-in" ? "#3b82f6" :
                            b.bookingStatus === "confirmed" ? "#10b981" :
                            b.bookingStatus === "pending" ? "#f59e0b" : "#e2e8f0";
                          
                          return (
                            <div 
                              key={bIdx}
                              className="calendar-booking-bar"
                              style={{
                                backgroundColor: owner ? `${statusColor}15` : "#e2e8f0",
                                color: owner ? statusColor : "var(--text-muted)",
                                borderLeft: `3px solid ${owner ? statusColor : "#94a3b8"}`,
                              }}
                              title={owner ? `${b.customerName} (Rm ${b.roomNumber})` : "Booked"}
                            >
                              {owner ? `${b.customerName} (${b.roomNumber})` : "🔒 Booked"}
                            </div>
                          );
                        })}
                        {cellBookings.length > 3 && (
                          <div className="calendar-more-badge">
                            + {cellBookings.length - 3} more
                          </div>
                        )}
                      </div>

                      {/* Mobile Indicator Dots */}
                      <div className="calendar-mobile-dots">
                        {cellBookings.slice(0, 4).map((b, bIdx) => {
                          const statusColor = 
                            b.bookingStatus === "checked-in" ? "#3b82f6" :
                            b.bookingStatus === "confirmed" ? "#10b981" :
                            b.bookingStatus === "pending" ? "#f59e0b" : "#94a3b8";
                          return (
                            <span 
                              key={bIdx} 
                              className="calendar-mobile-dot" 
                              style={{ backgroundColor: statusColor }}
                            />
                          );
                        })}
                        {cellBookings.length > 4 && (
                          <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", lineHeight: 1 }}>+</span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>


      {/* Clicked Day Bookings Modal */}
      {clickedDayInfo && (
        <div className="modal-overlay" onClick={() => setClickedDayInfo(null)}>
          <div className="modal-content modal-content-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>
                Bookings on {clickedDayInfo.date.toLocaleDateString(undefined, { dateStyle: "long" })}
              </h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setClickedDayInfo(null)}>
                <X size={16} />
              </button>
            </div>
            
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "60vh", overflowY: "auto" }}>
              {clickedDayInfo.bookings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                  <Calendar size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
                  <p>No bookings active on this date.</p>
                </div>
              ) : (
                clickedDayInfo.bookings.map((b) => {
                  const owner = isOwner(b);
                  
                  // Calculate stay duration (nights)
                  const start = new Date(b.checkInDate);
                  const end = new Date(b.checkOutDate);
                  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
                  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
                  const diffDays = Math.floor((utcEnd - utcStart) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div 
                      key={b.bookingId} 
                      className="card" 
                      style={{ 
                        padding: "1rem", 
                        borderLeft: `4px solid ${
                          b.bookingStatus === "checked-in" ? "#3b82f6" :
                          b.bookingStatus === "confirmed" ? "#10b981" : "#f59e0b"
                        }`,
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h4 style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                          {b.customerName} {!owner && <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: "normal" }}>(Restricted)</span>}
                        </h4>
                        <span className={`badge badge-${
                          b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in" ? "success" : "warning"
                        }`}>
                          {b.bookingStatus}
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.85rem" }}>
                        <div>
                          <strong style={{ color: "var(--text-secondary)" }}>Room Number:</strong> {b.roomNumber}
                        </div>
                        <div>
                          <strong style={{ color: "var(--text-secondary)" }}>Stay Duration:</strong> {diffDays} {diffDays === 1 ? "Night" : "Nights"}
                        </div>
                        <div>
                          <strong style={{ color: "var(--text-secondary)" }}>Check-in:</strong> {b.checkInDate}
                        </div>
                        <div>
                          <strong style={{ color: "var(--text-secondary)" }}>Check-out:</strong> {b.checkOutDate}
                        </div>
                        <div>
                          <strong style={{ color: "var(--text-secondary)" }}>Created By:</strong> {b.createdByName || "System"} ({b.createdByRole || "admin"})
                        </div>
                        {owner && (
                          <div>
                            <strong style={{ color: "var(--text-secondary)" }}>Phone:</strong> {b.customerPhone}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px dashed var(--card-border)", paddingTop: "0.5rem", marginTop: "0.25rem" }}>
                        {owner ? (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
                            onClick={() => {
                              setSelectedBooking(b);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye size={14} />
                            <span>View Full Details</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Lock size={12} /> Details Locked (Restricted)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setClickedDayInfo(null)}>
                Close
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  const dateStr = clickedDayInfo.date.toISOString().split("T")[0];
                  setClickedDayInfo(null);
                  handleOpenCreate(dateStr);
                }}
              >
                <Plus size={16} />
                <span>New Booking</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INLINE ADD BOOKING MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>
                Create New Booking
              </h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitBooking} className="modal-body">
              {formError && (
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "0.5rem", 
                  backgroundColor: "var(--danger-glow)", 
                  color: "var(--danger)",
                  padding: "0.75rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem",
                  marginBottom: "1rem"
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              <h3 style={{ fontSize: "0.9rem", color: "var(--primary)", textTransform: "uppercase", marginBottom: "1rem", letterSpacing: "0.05em" }}>
                1. Customer Details
              </h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div className="form-group">
                  <label>Customer Full Name *</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number * (10 Digits)</label>
                  <input 
                    type="tel" 
                    className="input-control" 
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9]/g, "").substring(0, 10))}
                    placeholder="e.g. 9876543210"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    className="input-control" 
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="name@email.com"
                  />
                </div>
                <div className="form-group">
                  <label>Billing / Home Address</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="123 Street Name"
                  />
                </div>
              </div>

              <h3 style={{ fontSize: "0.9rem", color: "var(--primary)", textTransform: "uppercase", marginTop: "1.5rem", marginBottom: "1rem", letterSpacing: "0.05em" }}>
                2. Stay & Room Details
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div className="form-group" style={{ gridColumn: "span 3" }}>
                  <label>Room Type *</label>
                  <select 
                    className="input-control"
                    value={selectedRoomType}
                    onChange={(e) => {
                      setSelectedRoomType(e.target.value);
                      setSelectedRoomNumbers([]);
                    }}
                    required
                  >
                    <option value="">Select Room Type</option>
                    {roomTypes.map(rt => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name} - (₹{rt.price}/night)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Check-in Date *</label>
                  <input 
                    type="date" 
                    className="input-control" 
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Check-out Date *</label>
                  <input 
                    type="date" 
                    className="input-control" 
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Guests Count *</label>
                  <input 
                    type="number" 
                    className="input-control" 
                    min="1"
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                    required
                  />
                </div>
              </div>



              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Total Price (₹)</label>
                  <input 
                    type="number" 
                    className="input-control" 
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Balance Amount (₹)</label>
                  <input 
                    type="number" 
                    className="input-control" 
                    style={{ backgroundColor: "var(--bg-tertiary)", cursor: "not-allowed" }}
                    value={Number(totalAmount) - Number(advanceAmount)}
                    readOnly
                  />
                </div>
              </div>

              <h3 style={{ fontSize: "0.9rem", color: "var(--primary)", textTransform: "uppercase", marginTop: "1.5rem", marginBottom: "1rem", letterSpacing: "0.05em" }}>
                3. Reservation Status
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Payment Status</label>
                  <select 
                    className="input-control"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial Payment</option>
                    <option value="paid">Fully Paid</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select 
                    className="input-control"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="none">None / Pending</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="online">Online</option>
                    <option value="split-online-cash">Split: Online + Cash</option>
                    <option value="split-card-cash">Split: Card + Cash</option>
                    <option value="split-card-online">Split: Card + Online</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Booking Status</label>
                  <select 
                    className="input-control"
                    value={bookingStatus}
                    onChange={(e) => setBookingStatus(e.target.value)}
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="pending">Pending</option>
                    <option value="checked-in">Checked In</option>
                    <option value="checked-out">Checked Out</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Advance Amount Paid (₹)</label>
                  <input 
                    type="number" 
                    className="input-control" 
                    min="0"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>Upload Payment Proof (Receipt / Screenshot)</label>
                  <input 
                    type="file" 
                    className="input-control" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  {paymentProof && (
                    <div style={{ marginTop: "0.5rem", display: "flex", gap: "1rem", alignItems: "flex-end" }}>
                      <img src={paymentProof} alt="Payment Proof" style={{ maxWidth: "120px", maxHeight: "120px", borderRadius: "4px", border: "1px solid var(--card-border)" }} />
                      <button type="button" className="btn btn-danger" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }} onClick={() => setPaymentProof("")}>Remove</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Special Remarks / Internal Notes</label>
                <textarea 
                  className="input-control" 
                  rows="3"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? "Saving..." : "Save Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL DIALOG MODAL (Enforces Option B - Mixed Access) */}
      {isDetailOpen && selectedBooking && (
        <div className="modal-overlay" style={{ zIndex: 1010 }} onClick={() => setIsDetailOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600, display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span>Booking Details</span>
                <span className="badge" style={{ backgroundColor: "var(--bg-tertiary)", fontSize: "0.75rem" }}>
                  {selectedBooking.bookingId}
                </span>
              </h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsDetailOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body info-detail-grid">
              
              {isOwner(selectedBooking) ? (
                // Full details (Admin or Creator)
                <>
                  <div className="info-detail-full" style={{ borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: "0.85rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Customer Profile
                    </h3>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Name</span>
                    <span className="info-detail-value">{selectedBooking.customerName}</span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Phone</span>
                    <span className="info-detail-value">{selectedBooking.customerPhone}</span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Email</span>
                    <span className="info-detail-value">{selectedBooking.customerEmail || "—"}</span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Address</span>
                    <span className="info-detail-value">{selectedBooking.customerAddress || "—"}</span>
                  </div>

                  <div className="info-detail-full" style={{ borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.5rem", marginTop: "0.75rem", marginBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: "0.85rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Stay & Billing
                    </h3>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Room Number</span>
                    <span className="info-detail-value">Room {selectedBooking.roomNumber}</span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Room Type</span>
                    <span className="info-detail-value" style={{ textTransform: "capitalize" }}>
                      {roomTypes.find(rt => rt.id === selectedBooking.roomType)?.name || selectedBooking.roomType}
                    </span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Check-in</span>
                    <span className="info-detail-value">{selectedBooking.checkInDate}</span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Check-out</span>
                    <span className="info-detail-value">{selectedBooking.checkOutDate}</span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Guests Count</span>
                    <span className="info-detail-value">{selectedBooking.guestCount || 1} Guests</span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Total Amount</span>
                    <span className="info-detail-value">₹{selectedBooking.totalAmount}</span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Booking Status</span>
                    <span className="info-detail-value">
                      <span className={`badge badge-${
                        selectedBooking.bookingStatus === "confirmed" || selectedBooking.bookingStatus === "checked-in" ? "success" : 
                        selectedBooking.bookingStatus === "cancelled" ? "danger" : "warning"
                      }`}>
                        {selectedBooking.bookingStatus}
                      </span>
                    </span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Payment Status</span>
                    <span className="info-detail-value" style={{ textTransform: "uppercase", fontSize: "0.8rem" }}>
                      {selectedBooking.paymentStatus}
                    </span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Payment Method</span>
                    <span className="info-detail-value" style={{ textTransform: "capitalize" }}>
                      {selectedBooking.paymentMethod || "None"}
                    </span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Advance Paid</span>
                    <span className="info-detail-value">
                      ₹{selectedBooking.advanceAmount || 0}
                    </span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Balance Due</span>
                    <span className="info-detail-value" style={{ fontWeight: 700, color: "var(--danger)" }}>
                      ₹{Number(selectedBooking.totalAmount || 0) - Number(selectedBooking.advanceAmount || 0)}
                    </span>
                  </div>

                  {selectedBooking.paymentProof && (
                    <div className="info-detail-full" style={{ marginTop: "0.75rem", borderTop: "1px dashed var(--card-border)", paddingTop: "0.75rem" }}>
                      <span className="info-detail-label" style={{ display: "block", marginBottom: "0.5rem" }}>Payment Proof Attachment</span>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
                        <img 
                          src={selectedBooking.paymentProof} 
                          alt="Payment Proof" 
                          style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: "4px", border: "1px solid var(--card-border)", boxShadow: "var(--shadow-sm)" }} 
                        />
                        <a 
                          href={selectedBooking.paymentProof} 
                          download={`payment_proof_${selectedBooking.bookingId}`} 
                          className="btn btn-secondary" 
                          style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", height: "fit-content", display: "inline-flex", alignItems: "center" }}
                        >
                          Download Proof
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="info-detail-full" style={{ borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.5rem", marginTop: "0.75rem", marginBottom: "0.5rem" }}>
                    <h3 style={{ fontSize: "0.85rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Audit Details
                    </h3>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Created By</span>
                    <span className="info-detail-value">
                      {selectedBooking.createdByName} ({selectedBooking.createdByRole})
                    </span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Registered On</span>
                    <span className="info-detail-value">
                      {selectedBooking.createdAt?.seconds 
                        ? new Date(selectedBooking.createdAt.seconds * 1000).toLocaleString()
                        : "—"}
                    </span>
                  </div>

                  <div className="info-detail-full">
                    <span className="info-detail-label">Remarks</span>
                    <span className="info-detail-value" style={{ fontWeight: "normal", fontSize: "0.85rem", fontStyle: "italic" }}>
                      {selectedBooking.remarks || "No remarks entered."}
                    </span>
                  </div>
                </>
              ) : (
                // Limited details (Employee viewing other employee's booking)
                <>
                  <div className="info-detail-full" style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "0.5rem", 
                    backgroundColor: "var(--bg-primary)", 
                    padding: "0.75rem", 
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "1rem"
                  }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Privacy active: Customer profile & payment info are restricted for bookings created by other users.
                    </span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Occupancy Status</span>
                    <span className="info-detail-value" style={{ color: "var(--warning)", fontWeight: 700 }}>
                      Booked / Occupied
                    </span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Room number</span>
                    <span className="info-detail-value">Room {selectedBooking.roomNumber}</span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Room Type</span>
                    <span className="info-detail-value" style={{ textTransform: "capitalize" }}>
                      {roomTypes.find(rt => rt.id === selectedBooking.roomType)?.name || selectedBooking.roomType}
                    </span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Stay Dates</span>
                    <span className="info-detail-value">
                      {selectedBooking.checkInDate} to {selectedBooking.checkOutDate}
                    </span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Guest Count</span>
                    <span className="info-detail-value">
                      [Restricted]
                    </span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Rate / Charge</span>
                    <span className="info-detail-value">[Restricted]</span>
                  </div>

                  <div className="info-detail-item">
                    <span className="info-detail-label">Created By</span>
                    <span className="info-detail-value">
                      {selectedBooking.createdByName} ({selectedBooking.createdByRole})
                    </span>
                  </div>
                </>
              )}

            </div>

            <div className="modal-footer">
              {isOwner(selectedBooking) && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setIsDetailOpen(false);
                    navigate(`/bookings?editId=${selectedBooking.bookingId}`);
                  }}
                >
                  Edit Booking
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setIsDetailOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
