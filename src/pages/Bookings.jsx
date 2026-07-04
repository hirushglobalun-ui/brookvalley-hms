import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../firebase/auth";
import { 
  getBookings, 
  getRooms, 
  getRoomTypes, 
  addBooking, 
  updateBooking, 
  deleteBooking 
} from "../firebase/db";
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  X, 
  Eye,
  Calendar,
  DollarSign,
  User,
  Phone,
  Mail,
  AlertCircle
} from "lucide-react";

const Bookings = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Data States
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roomTypeFilter, setRoomTypeFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState(user.role === "admin" ? "all" : "mine");

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Form Fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedRoomType, setSelectedRoomType] = useState("");
  const [selectedRoomNumber, setSelectedRoomNumber] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [bookingStatus, setBookingStatus] = useState("confirmed");
  const [remarks, setRemarks] = useState("");

  const refreshData = async () => {
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
      console.error("Error loading bookings data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Recalculate price dynamically based on room type selection and dates
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
          setTotalAmount(price * diffDays);
        } else {
          setTotalAmount(0);
        }
      } else {
        setTotalAmount(0);
      }
    } else {
      setTotalAmount(0);
    }
  }, [selectedRoomType, checkInDate, checkOutDate, roomTypes]);

  // Open creation modal
  const handleOpenCreate = () => {
    setSelectedBooking(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerAddress("");
    setSelectedRoomType("");
    setSelectedRoomNumber("");
    setCheckInDate("");
    setCheckOutDate("");
    setGuestCount(1);
    setTotalAmount(0);
    setPaymentStatus("unpaid");
    setBookingStatus("confirmed");
    setRemarks("");
    setFormError("");
    setIsModalOpen(true);
  };
  
  // Handle Prefills from Calendar
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefillDate = params.get("prefillDate");
    if (prefillDate) {
      handleOpenCreate();
      setCheckInDate(prefillDate);
      
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
      }
    }
  }, [location]);

  // Open edit modal
  const handleOpenEdit = (booking) => {
    setSelectedBooking(booking);
    setCustomerName(booking.customerName);
    setCustomerPhone(booking.customerPhone);
    setCustomerEmail(booking.customerEmail);
    setCustomerAddress(booking.customerAddress || "");
    setSelectedRoomType(booking.roomType);
    setSelectedRoomNumber(booking.roomNumber);
    setCheckInDate(booking.checkInDate);
    setCheckOutDate(booking.checkOutDate);
    setGuestCount(booking.guestCount || 1);
    setTotalAmount(booking.totalAmount);
    setPaymentStatus(booking.paymentStatus);
    setBookingStatus(booking.bookingStatus);
    setRemarks(booking.remarks || "");
    setFormError("");
    setIsModalOpen(true);
  };

  // Open details modal
  const handleOpenDetails = (booking) => {
    setSelectedBooking(booking);
    setIsDetailOpen(true);
  };

  // Auto assign room number based on room type selection and check-in / check-out dates
  const autoAssignRoom = (roomTypeId, checkIn, checkOut, currentBookingId = null) => {
    const candidateRooms = rooms.filter(r => r.roomType === roomTypeId);
    if (candidateRooms.length === 0) return null;

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    for (const room of candidateRooms) {
      const isBooked = bookings.some(b => {
        if (b.bookingStatus === "cancelled") return false;
        if (currentBookingId && b.bookingId === currentBookingId) return false;
        if (b.roomNumber !== room.roomNumber) return false;

        const bStart = new Date(b.checkInDate);
        const bEnd = new Date(b.checkOutDate);
        return (start < bEnd && end > bStart);
      });

      if (!isBooked) {
        return room.roomNumber;
      }
    }

    return null;
  };

  // Submit Booking Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    
    if (new Date(checkInDate) >= new Date(checkOutDate)) {
      setFormError("Check-out date must be after check-in date.");
      return;
    }

    // Auto assign room number based on selected room type and dates
    const roomNo = autoAssignRoom(selectedRoomType, checkInDate, checkOutDate, selectedBooking?.bookingId);
    if (!roomNo) {
      setFormError("No rooms of this type are available for the selected dates.");
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
        roomNumber: roomNo,
        checkInDate,
        checkOutDate,
        guestCount: Number(guestCount),
        totalAmount: Number(totalAmount),
        paymentStatus,
        bookingStatus,
        remarks
      };

      if (selectedBooking) {
        await updateBooking(selectedBooking.bookingId, data, user);
      } else {
        await addBooking(data, user);
      }

      setIsModalOpen(false);
      refreshData();
    } catch (err) {
      setFormError(err.message || "Failed to save booking.");
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Booking
  const handleDelete = async (booking) => {
    if (window.confirm(`Are you sure you want to delete booking ${booking.bookingId}?`)) {
      try {
        await deleteBooking(booking.bookingId, booking.roomNumber, user);
        refreshData();
      } catch (err) {
        alert("Failed to delete booking: " + err.message);
      }
    }
  };

  // Filter Bookings
  const filteredBookings = bookings.filter(b => {
    // Search filter
    const matchesSearch = 
      b.bookingId.toLowerCase().includes(search.toLowerCase()) ||
      (user.role === "admin" || b.createdByUid === user.uid 
        ? b.customerName.toLowerCase().includes(search.toLowerCase()) || b.customerPhone.includes(search)
        : false);

    // Status filter
    const matchesStatus = statusFilter === "all" || b.bookingStatus === statusFilter;

    // Room Type filter
    const matchesRoomType = roomTypeFilter === "all" || b.roomType === roomTypeFilter;

    // Scope filter (Admin sees all, Employee defaults to own)
    const matchesScope = scopeFilter === "all" || b.createdByUid === user.uid;

    return matchesSearch && matchesStatus && matchesRoomType && matchesScope;
  });

  // Get available rooms for selected room type (taking dates into consideration is complex client-side, 
  // so we show rooms of the selected type and alert if they conflict, or show all rooms of this type).
  const typeRooms = rooms.filter(r => r.roomType === selectedRoomType);

  // Masking utilities
  const isOwner = (booking) => user.role === "admin" || booking.createdByUid === user.uid;
  const mask = (val, booking, fallback = "[Restricted]") => {
    return isOwner(booking) ? val : fallback;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Title Header */}
      <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
        <div className="flex-between">
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Bookings Management</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>Add, edit and monitor hotel bookings.</p>
          </div>
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            <span>New Booking</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <div className="search-bar-container">
          {/* Text Search */}
          <div className="search-input-wrapper" style={{ flex: 2 }}>
            <Search className="search-input-icon" />
            <input 
              type="text" 
              className="input-control search-input" 
              placeholder="Search by Booking ID, Customer Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>



          {/* Room Type Filter */}
          <select 
            className="input-control" 
            style={{ width: "auto", minWidth: "150px" }}
            value={roomTypeFilter}
            onChange={(e) => setRoomTypeFilter(e.target.value)}
          >
            <option value="all">All Room Types</option>
            {roomTypes.map(rt => (
              <option key={rt.id} value={rt.id}>{rt.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select 
            className="input-control" 
            style={{ width: "auto", minWidth: "150px" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="checked-in">Checked In</option>
            <option value="checked-out">Checked Out</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="no-data">Loading reservations...</div>
          ) : filteredBookings.length > 0 ? (
            <>
              {/* Desktop/Tablet Table Layout */}
              <table className="table-custom bookings-main-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Customer Name</th>
                    <th>Phone Number</th>
                    <th>Stay Dates</th>
                    <th>Created By</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map(b => (
                    <tr key={b.bookingId}>
                      <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{b.bookingId}</td>
                      <td>{mask(b.customerName, b)}</td>
                      <td>{mask(b.customerPhone, b)}</td>
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
                        <span className="badge" style={{ padding: "1px 4px", fontSize: "0.65rem", backgroundColor: "var(--bg-tertiary)" }}>
                          {b.createdByRole}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <span className={`badge badge-${
                            b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in" ? "success" : 
                            b.bookingStatus === "cancelled" ? "danger" : "warning"
                          }`} style={{ width: "fit-content", fontSize: "0.7rem", padding: "2px 6px" }}>
                            {b.bookingStatus}
                          </span>
                          <span className={`badge badge-${b.paymentStatus === "paid" ? "success" : b.paymentStatus === "partial" ? "warning" : "danger"}`} style={{ width: "fit-content", fontSize: "0.65rem", padding: "1px 4px", border: "1px solid currentColor", background: "none" }}>
                            {b.paymentStatus}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          {isOwner(b) && (
                            <>
                              <button 
                                className="btn btn-secondary btn-icon" 
                                title="View Booking Details"
                                onClick={() => handleOpenDetails(b)}
                              >
                                <Eye size={14} />
                              </button>
                              
                              <button 
                                className="btn btn-secondary btn-icon" 
                                title="Edit Booking"
                                onClick={() => handleOpenEdit(b)}
                              >
                                <Edit2 size={14} />
                              </button>
                              
                              <button 
                                className="btn btn-danger btn-icon" 
                                title="Delete Booking"
                                onClick={() => handleDelete(b)}
                              >
                                <Trash2 size={14} style={{ color: "white" }} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card List Layout */}
              <div className="bookings-mobile-cards">
                {filteredBookings.map(b => {
                  const isUserOwner = isOwner(b);
                  return (
                    <div key={b.bookingId} className="booking-mobile-card" style={{ padding: "1.25rem" }}>
                      <div className="booking-card-row">
                        <span className="booking-card-room" style={{ fontFamily: "monospace" }}>{b.bookingId}</span>
                        <div style={{ display: "flex", gap: "0.25rem" }}>
                          <span className={`badge badge-${
                            b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in" ? "success" : 
                            b.bookingStatus === "cancelled" ? "danger" : "warning"
                          }`} style={{ fontSize: "0.65rem", padding: "2px 6px" }}>
                            {b.bookingStatus}
                          </span>
                          <span className={`badge badge-${b.paymentStatus === "paid" ? "success" : b.paymentStatus === "partial" ? "warning" : "danger"}`} style={{ fontSize: "0.65rem", padding: "2px 6px", border: "1px solid currentColor", background: "none" }}>
                            {b.paymentStatus}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", margin: "0.25rem 0" }}>
                        <span className="booking-card-customer" style={{ fontSize: "0.95rem" }}>
                          {mask(b.customerName, b)}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          {mask(b.customerPhone, b)}
                        </span>
                      </div>

                      <div className="booking-card-dates" style={{ margin: "0.25rem 0" }}>
                        <span>{b.checkInDate} to {b.checkOutDate}</span>
                      </div>

                      <div className="booking-card-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--card-border)", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>By: {b.createdByName}</span>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "capitalize" }}>({b.createdByRole})</span>
                        </div>

                        {isUserOwner && (
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <button 
                              className="btn btn-secondary btn-icon" 
                              title="View Booking Details"
                              style={{ padding: "0.4rem" }}
                              onClick={() => handleOpenDetails(b)}
                            >
                              <Eye size={13} />
                            </button>
                            
                            <button 
                              className="btn btn-secondary btn-icon" 
                              title="Edit Booking"
                              style={{ padding: "0.4rem" }}
                              onClick={() => handleOpenEdit(b)}
                            >
                              <Edit2 size={13} />
                            </button>
                            
                            <button 
                              className="btn btn-danger btn-icon" 
                              title="Delete Booking"
                              style={{ padding: "0.4rem" }}
                              onClick={() => handleDelete(b)}
                            >
                              <Trash2 size={13} style={{ color: "white" }} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="no-data">No bookings match the search criteria.</div>
          )}
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>
                {selectedBooking ? `Edit Booking ${selectedBooking.bookingId}` : "Create New Booking"}
              </h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
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
                  <label>Phone Number *</label>
                  <input 
                    type="tel" 
                    className="input-control" 
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
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
                      setSelectedRoomNumber("");
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
                  <label>Guests Count</label>
                  <input 
                    type="number" 
                    className="input-control" 
                    min="1"
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                <label>Total Price (₹)</label>
                <input 
                  type="number" 
                  className="input-control" 
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
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

      {/* DETAIL MODAL */}
      {isDetailOpen && selectedBooking && (
        <div className="modal-overlay" onClick={() => setIsDetailOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600, display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span>Booking Record</span>
                <span className="badge" style={{ backgroundColor: "var(--bg-tertiary)", fontSize: "0.75rem" }}>
                  {selectedBooking.bookingId}
                </span>
              </h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsDetailOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body info-detail-grid">
              {/* Customer Details section (Conditional Masking) */}
              <div className="info-detail-full" style={{ borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.75rem", marginBottom: "0.5rem" }}>
                <h3 style={{ fontSize: "0.85rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Customer Profile
                </h3>
              </div>

              <div className="info-detail-item">
                <span className="info-detail-label">Name</span>
                <span className="info-detail-value">{mask(selectedBooking.customerName, selectedBooking)}</span>
              </div>

              <div className="info-detail-item">
                <span className="info-detail-label">Phone</span>
                <span className="info-detail-value">{mask(selectedBooking.customerPhone, selectedBooking)}</span>
              </div>

              <div className="info-detail-item">
                <span className="info-detail-label">Email</span>
                <span className="info-detail-value">{mask(selectedBooking.customerEmail, selectedBooking, "[Restricted]") || "—"}</span>
              </div>

              <div className="info-detail-item">
                <span className="info-detail-label">Address</span>
                <span className="info-detail-value">{mask(selectedBooking.customerAddress, selectedBooking, "[Restricted]") || "—"}</span>
              </div>

              {/* Stay / Room Details Section (Unmasked/Occupancy data) */}
              <div className="info-detail-full" style={{ borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.75rem", marginTop: "1rem", marginBottom: "0.5rem" }}>
                <h3 style={{ fontSize: "0.85rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Room & Dates
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
                <span className="info-detail-label">Total Charged</span>
                <span className="info-detail-value">
                  {isOwner(selectedBooking) ? `₹${selectedBooking.totalAmount}` : "[Restricted]"}
                </span>
              </div>

              {/* Status Section */}
              <div className="info-detail-full" style={{ borderBottom: "1px dashed var(--card-border)", paddingBottom: "0.75rem", marginTop: "1rem", marginBottom: "0.5rem" }}>
                <h3 style={{ fontSize: "0.85rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Audit & Status
                </h3>
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
                <span className="info-detail-label">Payment status</span>
                <span className="info-detail-value" style={{ textTransform: "uppercase", fontSize: "0.8rem" }}>
                  {selectedBooking.paymentStatus}
                </span>
              </div>

              <div className="info-detail-item">
                <span className="info-detail-label">Registered By</span>
                <span className="info-detail-value">
                  {selectedBooking.createdByName} ({selectedBooking.createdByRole})
                </span>
              </div>

              <div className="info-detail-item">
                <span className="info-detail-label">Creation Date</span>
                <span className="info-detail-value">
                  {selectedBooking.createdAt?.seconds 
                    ? new Date(selectedBooking.createdAt.seconds * 1000).toLocaleString()
                    : "—"}
                </span>
              </div>

              <div className="info-detail-full">
                <span className="info-detail-label">Internal Remarks</span>
                <span className="info-detail-value" style={{ fontWeight: "normal", fontSize: "0.85rem", fontStyle: "italic", whiteSpace: "pre-line" }}>
                  {mask(selectedBooking.remarks, selectedBooking, "[Restricted]") || "No remarks entered."}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setIsDetailOpen(false)}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
