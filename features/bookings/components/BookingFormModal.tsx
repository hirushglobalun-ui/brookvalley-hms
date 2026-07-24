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
  const [guestCount, setGuestCount] = useState<number | "">(1);
  const [totalAmount, setTotalAmount] = useState<number | "">(0);
  const [paymentStatus, setPaymentStatus] = useState<Booking["paymentStatus"]>("unpaid");
  const [bookingStatus, setBookingStatus] = useState<Booking["bookingStatus"]>("confirmed");
  const [paymentMethod, setPaymentMethod] = useState("none");
  const [advanceAmount, setAdvanceAmount] = useState<number | "">(0);
  const [paymentProofs, setPaymentProofs] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");
  
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const hasInitialized = React.useRef(false);

  // Prefill or Load Existing Booking data
  useEffect(() => {
    if (!isOpen) {
      hasInitialized.current = false;
      return;
    }

    if (hasInitialized.current) return;

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
      setPaymentProofs(booking.paymentProof ? booking.paymentProof.split(",").map(p => p.trim()).filter(Boolean) : []);
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
        // Try to recover from sessionStorage if no prefill
        try {
          const draftStr = sessionStorage.getItem("bookingFormDraft");
          if (draftStr) {
            const draft = JSON.parse(draftStr);
            setCustomerName(draft.customerName || "");
            setCustomerPhone(draft.customerPhone || "");
            setCustomerEmail(draft.customerEmail || "");
            setCustomerAddress(draft.customerAddress || "");
            setSelectedRoomType(draft.selectedRoomType || "");
            setSelectedRoomNumbers(draft.selectedRoomNumbers || []);
            setCheckInDate(draft.checkInDate || "");
            setCheckOutDate(draft.checkOutDate || "");
            setGuestCount(draft.guestCount || 1);
            setTotalAmount(draft.totalAmount || 0);
            setPaymentStatus(draft.paymentStatus || "unpaid");
            setBookingStatus(draft.bookingStatus || "confirmed");
            setPaymentMethod(draft.paymentMethod || "none");
            setAdvanceAmount(draft.advanceAmount || 0);
            setPaymentProofs(draft.paymentProofs || []);
            setRemarks(draft.remarks || "");
            hasInitialized.current = true;
            return;
          }
        } catch (e) {
          console.error("Failed to parse draft", e);
        }

        setCheckInDate("");
        setCheckOutDate("");
      }

      setGuestCount(1);
      setTotalAmount(0);
      setPaymentStatus("unpaid");
      setBookingStatus("confirmed");
      setPaymentMethod("none");
      setAdvanceAmount(0);
      setPaymentProofs([]);
      setRemarks("");
      setFormError("");
    }
    
    hasInitialized.current = true;
  }, [isOpen, booking, initialPrefill, rooms, roomTypes]);

  // Save to draft on change
  useEffect(() => {
    if (!isOpen || booking) return; // Only save drafts for new bookings
    const draft = {
      customerName, customerPhone, customerEmail, customerAddress,
      selectedRoomType, selectedRoomNumbers, checkInDate, checkOutDate,
      guestCount, totalAmount, paymentStatus, bookingStatus,
      paymentMethod, advanceAmount, paymentProofs, remarks
    };
    sessionStorage.setItem("bookingFormDraft", JSON.stringify(draft));
  }, [
    isOpen, booking, customerName, customerPhone, customerEmail, customerAddress,
    selectedRoomType, selectedRoomNumbers, checkInDate, checkOutDate,
    guestCount, totalAmount, paymentStatus, bookingStatus,
    paymentMethod, advanceAmount, paymentProofs, remarks
  ]);

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

  // Handle file selection — store as data URLs
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024);
      if (validFiles.length < files.length) {
        alert("Some files are too large and were ignored. Please select files under 10MB.");
      }
      
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPaymentProofs(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
    e.target.value = "";
  };

  const handleRemoveProof = (indexToRemove: number) => {
    setPaymentProofs(prev => prev.filter((_, i) => i !== indexToRemove));
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
      let finalPaymentProofs: string[] = [];
      for (const proof of paymentProofs) {
        if (proof.startsWith("http://") || proof.startsWith("https://")) {
          finalPaymentProofs.push(proof);
        } else if (proof.startsWith("data:")) {
          const uploadedUrl = await uploadPaymentProof(proof);
          finalPaymentProofs.push(uploadedUrl);
        } else {
          finalPaymentProofs.push(proof);
        }
      }
      const finalPaymentProofString = finalPaymentProofs.join(",");

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
        paymentProof: finalPaymentProofString,
        remarks
      };

      sessionStorage.removeItem("bookingFormDraft");
      sessionStorage.removeItem("isFormOpen");
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setFormError(err.message || "Failed to save booking.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleClose = () => {
    sessionStorage.removeItem("bookingFormDraft");
    sessionStorage.removeItem("isFormOpen");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose} role="dialog" aria-modal="true" aria-label={booking ? "Edit Booking Modal" : "Create Booking Modal"}>
      <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>
            {booking ? `Edit Booking ${booking.bookingId}` : "Create New Booking"}
          </h2>
          <button type="button" className="btn btn-secondary btn-icon" onClick={handleClose} aria-label="Close modal">
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
                onChange={(e) => setGuestCount(e.target.value === "" ? "" : Number(e.target.value))}
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
                onChange={(e) => setTotalAmount(e.target.value === "" ? "" : Number(e.target.value))}
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
                onChange={(e) => setAdvanceAmount(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div className="form-group" style={{ gridColumn: "span 2" }}>
              <label>Upload Payment Proof(s) (Receipt / Screenshot)</label>
              
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                {paymentProofs.map((proof, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center", border: "1px solid var(--card-border)", padding: "0.5rem", borderRadius: "8px", backgroundColor: "var(--bg-secondary)" }}>
                    <img src={proof} alt={`Proof ${idx + 1}`} style={{ width: "120px", height: "120px", objectFit: "contain", borderRadius: "4px", backgroundColor: "var(--bg-tertiary)" }} />
                    <button type="button" className="btn btn-danger" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", width: "100%" }} onClick={() => handleRemoveProof(idx)}>Remove</button>
                  </div>
                ))}

                <label style={{ 
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", 
                  width: paymentProofs.length > 0 ? "138px" : "100%", 
                  height: paymentProofs.length > 0 ? "auto" : "120px", 
                  minHeight: "120px",
                  border: "2px dashed var(--primary)", borderRadius: "8px", 
                  cursor: "pointer", backgroundColor: "rgba(59,130,246,0.05)",
                  color: "var(--primary)", transition: "all 0.2s"
                }}>
                  <span style={{ fontSize: "2rem", marginBottom: paymentProofs.length > 0 ? "0" : "0.5rem", lineHeight: 1 }}>+</span>
                  {paymentProofs.length === 0 && <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Click to Add Payment Proofs</span>}
                  {paymentProofs.length > 0 && <span style={{ fontWeight: 600, fontSize: "0.75rem", marginTop: "0.5rem" }}>Add More</span>}
                  <input 
                    type="file" 
                    style={{ display: "none" }}
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                  />
                </label>
              </div>
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
            <button type="button" className="btn btn-secondary" onClick={() => {
              sessionStorage.removeItem("bookingFormDraft");
              sessionStorage.removeItem("isFormOpen");
              onClose();
            }}>
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
