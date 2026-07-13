"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, AlertCircle } from "lucide-react";
import { Booking, Room, RoomType } from "../../../types";
import { uploadPaymentProof } from "../../../lib/storage";

interface BookingFormModalProps {
  isOpen: boolean;
  booking: Booking | null;
  rooms: Room[];
  bookings: Booking[];
  roomTypes: RoomType[];
  initialPrefill: { checkInDate?: string; checkOutDate?: string; roomNumber?: string } | null;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const BookingFormModal: React.FC<BookingFormModalProps> = ({
  isOpen,
  booking,
  rooms,
  bookings,
  roomTypes,
  initialPrefill,
  onClose,
  onSubmit
}) => {
  // Form States
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedRoomType, setSelectedRoomType] = useState("");
  const [selectedRoomNumbers, setSelectedRoomNumbers] = useState<string[]>([]);
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guestCount, setGuestCount] = useState<number>(1);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<Booking["paymentStatus"]>("unpaid");
  const [bookingStatus, setBookingStatus] = useState<Booking["bookingStatus"]>("confirmed");
  const [paymentMethod, setPaymentMethod] = useState("none");
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [paymentProof, setPaymentProof] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [remarks, setRemarks] = useState("");
  
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Prefill or Load Existing Booking data
  useEffect(() => {
    if (!isOpen) return;

    if (booking) {
      setCustomerName(booking.customerName);
      setCustomerPhone(booking.customerPhone);
      setCustomerEmail(booking.customerEmail);
      setCustomerAddress(booking.customerAddress || "");
      setSelectedRoomType(booking.roomType);
      setSelectedRoomNumbers(booking.roomNumber ? booking.roomNumber.split(",").map(r => r.trim()) : []);
      setCheckInDate(booking.checkInDate);
      setCheckOutDate(booking.checkOutDate);
      setGuestCount(booking.guestCount || 1);
      setTotalAmount(booking.totalAmount);
      setPaymentStatus(booking.paymentStatus);
      setBookingStatus(booking.bookingStatus);
      setPaymentMethod(booking.paymentMethod || "none");
      setAdvanceAmount(booking.advanceAmount || 0);
      setPaymentProof(booking.paymentProof || "");
      setRemarks(booking.remarks || "");
      setFormError("");
    } else {
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setCustomerAddress("");
      setSelectedRoomType("");
      setSelectedRoomNumbers([]);
      
      if (initialPrefill) {
        setCheckInDate(initialPrefill.checkInDate || "");
        setCheckOutDate(initialPrefill.checkOutDate || "");
        if (initialPrefill.roomNumber) {
          const matchedRoom = rooms.find(r => r.roomNumber === initialPrefill.roomNumber);
          if (matchedRoom) {
            setSelectedRoomType(matchedRoom.roomType);
            const selectedType = roomTypes.find(rt => rt.id === matchedRoom.roomType);
            if (selectedType) {
              setGuestCount(selectedType.capacity);
            }
          }
        }
      } else {
        setCheckInDate("");
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
    }
  }, [isOpen, booking, initialPrefill, rooms, roomTypes]);

  // Date Formatting for Auto assignment messages
  const formatMsgDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  // Auto assign room number logic
  const autoAssignRoom = useCallback((roomTypeId: string, checkIn: string, checkOut: string, currentBookingId: string | null = null) => {
    const candidateRooms = rooms.filter(r => r.roomType === roomTypeId);
    if (candidateRooms.length === 0) {
      return { success: false, error: "No rooms configured for this room type." };
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return { success: false, error: "Invalid check-in or check-out date." };
    }

    let availableRoom = null;
    let conflictMsg = "All rooms of this type are fully booked or unavailable.";

    for (const room of candidateRooms) {
      // Respect the manual room status from Settings (maintenance, dirty, etc.)
      if (room.status && room.status !== "available") {
        conflictMsg = `Room ${room.roomNumber} is currently marked as ${room.status}.`;
        continue; // Skip this room
      }

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

      if (!conflict) {
        availableRoom = room;
        break; // Found an available room!
      } else {
        const creator = conflict.createdByName || "System";
        const statusLabel = conflict.bookingStatus.charAt(0).toUpperCase() + conflict.bookingStatus.slice(1);
        conflictMsg = `Already booked for ${conflict.customerName} (${statusLabel}) by ${creator} from ${formatMsgDate(conflict.checkInDate)} to ${formatMsgDate(conflict.checkOutDate)}.`;
      }
    }

    if (!availableRoom) {
      return { success: false, error: conflictMsg };
    }

    return { success: true, roomNumber: availableRoom.roomNumber };
  }, [rooms, bookings]);

  // Reactive room availability check
  useEffect(() => {
    if (selectedRoomType && checkInDate && checkOutDate) {
      const result = autoAssignRoom(selectedRoomType, checkInDate, checkOutDate, booking?.bookingId || null);
      if (!result.success) {
        setFormError(result.error || "Room assignment conflict.");
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
  }, [selectedRoomType, checkInDate, checkOutDate, booking, autoAssignRoom]);

  // Recalculate price dynamically
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

  // Handle file selection — store the raw File for upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Please select a file under 10MB.");
        e.target.value = "";
        return;
      }
      setPaymentProofFile(file);
      // Show preview for the UI
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProof(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const cleanPhone = customerPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length !== 10) {
      setFormError("Customer phone number must be exactly 10 digits.");
      return;
    }

    if (customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        setFormError("Please enter a valid email address.");
        return;
      }
    }
    
    if (new Date(checkInDate) >= new Date(checkOutDate)) {
      setFormError("Check-out date must be after check-in date.");
      return;
    }

    const result = autoAssignRoom(selectedRoomType, checkInDate, checkOutDate, booking?.bookingId || null);
    if (!result.success) {
      setFormError(result.error || "Room assignment conflict.");
      return;
    }

    setFormLoading(true);
    try {
      let finalPaymentProof = paymentProof;
      if (paymentProofFile) {
        finalPaymentProof = await uploadPaymentProof(paymentProofFile);
      } else if (paymentProof && paymentProof.startsWith("data:")) {
        finalPaymentProof = await uploadPaymentProof(paymentProof);
      }

      const payload = {
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
        paymentProof: finalPaymentProof,
        remarks
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setFormError(err.message || "Failed to save booking.");
    } finally {
      setFormLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={booking ? "Edit Booking Modal" : "Create Booking Modal"}>
      <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>
            {booking ? `Edit Booking ${booking.bookingId}` : "Create New Booking"}
          </h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>
        
        <form onSubmit={handleFormSubmit} className="modal-body">
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
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }} className="mobile-stacked-grid">
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }} className="mobile-stacked-grid">
            <div className="form-group" style={{ gridColumn: "span 3" }}>
              <label>Room Type *</label>
              <select 
                className="input-control"
                value={selectedRoomType}
                onChange={(e) => {
                  setSelectedRoomType(e.target.value);
                  setSelectedRoomNumbers([]);
                  const selectedType = roomTypes.find(rt => rt.id === e.target.value);
                  if (selectedType) {
                    setGuestCount(selectedType.capacity);
                  }
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
                onChange={(e) => setGuestCount(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }} className="mobile-stacked-grid">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Total Price (₹)</label>
              <input 
                type="number" 
                className="input-control" 
                value={totalAmount}
                onChange={(e) => setTotalAmount(Number(e.target.value))}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="mobile-stacked-grid">
            <div className="form-group">
              <label>Payment Status</label>
              <select 
                className="input-control"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as Booking["paymentStatus"])}
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
                onChange={(e) => setBookingStatus(e.target.value as Booking["bookingStatus"])}
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
                onChange={(e) => setAdvanceAmount(Number(e.target.value))}
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
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={formLoading}>
              {formLoading ? "Saving..." : "Save Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingFormModal;
