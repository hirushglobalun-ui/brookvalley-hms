"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, AlertCircle } from "lucide-react";
import { Booking, Room, RoomType } from "../../../types";
import { uploadPaymentProof } from "../../../lib/storage";
import { useAuth } from "../../../lib/auth";

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
  const { user } = useAuth();
  
  // Form States
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [selectedRoomType, setSelectedRoomType] = useState("");
  // State for manual vs multi room selection
  const [selectedRoomNumbers, setSelectedRoomNumbers] = useState<string[]>([]);
  const [roomFilterType, setRoomFilterType] = useState<string>("all");
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
  const [bookingSource, setBookingSource] = useState<Booking["bookingSource"]>("direct");
  const [agencyCommission, setAgencyCommission] = useState<number | "">(0);

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
      setRoomFilterType("all");
      const rList = booking.roomNumber ? booking.roomNumber.split(",").map(r => r.trim()).filter(Boolean) : [];
      setSelectedRoomNumbers(rList);
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
      setBookingSource(booking.bookingSource || "direct");
      setAgencyCommission(booking.agencyCommission || 0);
      setFormError("");
    } else {
      setCustomerName("");
      setCustomerPhone("");
      setCustomerEmail("");
      setCustomerAddress("");
      setSelectedRoomType("");
      setRoomFilterType("all");
      setSelectedRoomNumbers([]);
      
      if (initialPrefill) {
        setCheckInDate(initialPrefill.checkInDate || "");
        setCheckOutDate(initialPrefill.checkOutDate || "");
        if (initialPrefill.roomNumber) {
          const prefillRooms = initialPrefill.roomNumber.split(",").map(r => r.trim()).filter(Boolean);
          setSelectedRoomNumbers(prefillRooms);
          const matchedRoom = rooms.find(r => r.roomNumber === prefillRooms[0]);
          if (matchedRoom) {
            setSelectedRoomType(matchedRoom.roomType);
            setRoomFilterType(matchedRoom.roomType);
            const selectedType = roomTypes.find(rt => rt.id === matchedRoom.roomType);
            if (selectedType) {
              setGuestCount(selectedType.capacity * prefillRooms.length);
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
            setRoomFilterType(draft.selectedRoomType || "all");
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
            setBookingSource(draft.bookingSource || "direct");
            setAgencyCommission(draft.agencyCommission || 0);
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
      setBookingSource("direct");
      setAgencyCommission(0);
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
      paymentMethod, advanceAmount, paymentProofs, remarks,
      bookingSource, agencyCommission
    };
    sessionStorage.setItem("bookingFormDraft", JSON.stringify(draft));
  }, [
    isOpen, booking, customerName, customerPhone, customerEmail, customerAddress,
    selectedRoomType, selectedRoomNumbers, checkInDate, checkOutDate,
    guestCount, totalAmount, paymentStatus, bookingStatus,
    paymentMethod, advanceAmount, paymentProofs, remarks, bookingSource, agencyCommission
  ]);

  // Date Formatting for messages
  const formatMsgDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  // Helper to check room availability for selected date range
  const checkRoomAvailability = useCallback((roomNumber: string, checkIn: string, checkOut: string, currentBookingId: string | null = null) => {
    const room = rooms.find(r => r.roomNumber === roomNumber);
    if (!room) return { available: false, reason: "Room not found" };

    if (room.status && room.status !== "available") {
      return { available: false, reason: `Marked as ${room.status}` };
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return { available: false, reason: "Invalid dates" };
    }

    const conflict = bookings.find(b => {
      const activeStatuses = ["confirmed", "pending", "checked-in"];
      if (!activeStatuses.includes(b.bookingStatus)) return false;
      if (currentBookingId && b.bookingId === currentBookingId) return false;

      const bookedRoomNumbers = b.roomNumber ? b.roomNumber.split(",").map(r => r.trim()) : [];
      if (!bookedRoomNumbers.includes(roomNumber)) return false;

      const bStart = new Date(b.checkInDate);
      const bEnd = new Date(b.checkOutDate);
      return (start < bEnd && end > bStart);
    });

    if (conflict) {
      return { 
        available: false, 
        reason: `Booked by ${conflict.customerName} (${formatMsgDate(conflict.checkInDate)} - ${formatMsgDate(conflict.checkOutDate)})` 
      };
    }

    return { available: true, reason: "" };
  }, [rooms, bookings]);

  // Toggle room selection state
  const toggleRoomSelection = (roomNum: string) => {
    setSelectedRoomNumbers(prev => {
      if (prev.includes(roomNum)) {
        const next = prev.filter(r => r !== roomNum);
        return next;
      } else {
        return [...prev, roomNum];
      }
    });
  };

  // Auto assign room helper (picks N available rooms)
  const autoAssignRooms = (roomTypeId: string, count: number = 1) => {
    if (!checkInDate || !checkOutDate) {
      setFormError("Please select Check-in and Check-out dates first.");
      return;
    }

    const candidateRooms = rooms.filter(r => roomTypeId === "all" || r.roomType === roomTypeId);
    const availableCandidateRooms = candidateRooms.filter(r => {
      const status = checkRoomAvailability(r.roomNumber, checkInDate, checkOutDate, booking?.bookingId || null);
      return status.available && !selectedRoomNumbers.includes(r.roomNumber);
    });

    if (availableCandidateRooms.length === 0) {
      setFormError("No available rooms found for the selected type and dates.");
      return;
    }

    const toSelect = availableCandidateRooms.slice(0, count).map(r => r.roomNumber);
    setSelectedRoomNumbers(prev => [...prev, ...toSelect]);
    setFormError("");
  };

  // Calculate total combined capacity of selected rooms
  const combinedCapacity = React.useMemo(() => {
    return selectedRoomNumbers.reduce((sum, rNum) => {
      const room = rooms.find(r => r.roomNumber === rNum);
      if (!room) return sum;
      const rt = roomTypes.find(t => t.id === room.roomType);
      return sum + (rt?.capacity || 0);
    }, 0);
  }, [selectedRoomNumbers, rooms, roomTypes]);

  // Recalculate dynamic multi-room total amount
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
        const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
        const diffDays = Math.floor((utcEnd - utcStart) / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
          if (selectedRoomNumbers.length > 0) {
            let sumPerNight = 0;
            selectedRoomNumbers.forEach(rNum => {
              const room = rooms.find(r => r.roomNumber === rNum);
              const rt = roomTypes.find(t => t.id === room?.roomType) || roomTypes.find(t => t.id === selectedRoomType);
              sumPerNight += (rt ? rt.price : 0);
            });
            setTotalAmount(sumPerNight * diffDays);
          } else if (selectedRoomType) {
            const rt = roomTypes.find(t => t.id === selectedRoomType);
            setTotalAmount((rt ? rt.price : 0) * diffDays);
          } else {
            setTotalAmount(0);
          }
        } else {
          setTotalAmount(0);
        }
      } else {
        setTotalAmount(0);
      }
    } else {
      setTotalAmount(0);
    }
  }, [selectedRoomNumbers, selectedRoomType, checkInDate, checkOutDate, rooms, roomTypes]);

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

    if (selectedRoomNumbers.length === 0) {
      setFormError("Please select at least one room for this booking.");
      return;
    }

    // Check availability of each selected room
    for (const rNum of selectedRoomNumbers) {
      const status = checkRoomAvailability(rNum, checkInDate, checkOutDate, booking?.bookingId || null);
      if (!status.available) {
        setFormError(`Room ${rNum} cannot be booked for selected dates: ${status.reason}`);
        return;
      }
    }

    const primaryRoomType = selectedRoomType || (selectedRoomNumbers.length > 0 ? (rooms.find(r => r.roomNumber === selectedRoomNumbers[0])?.roomType || "") : "");

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
        roomType: primaryRoomType,
        roomNumber: selectedRoomNumbers.join(","),
        checkInDate,
        checkOutDate,
        guestCount: Number(guestCount),
        totalAmount: Number(totalAmount),
        paymentStatus,
        bookingStatus,
        paymentMethod,
        advanceAmount: Number(advanceAmount),
        paymentProof: finalPaymentProofString,
        remarks,
        bookingSource,
        agencyCommission: bookingSource === 'agency' ? Number(agencyCommission) : 0,
        createdByUid: user?.uid || user?.id,
        createdByName: user?.fullName || user?.email,
        createdByRole: user?.role
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

  const localToday = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const visibleRooms = rooms.filter(r => roomFilterType === "all" || r.roomType === roomFilterType || selectedRoomNumbers.includes(r.roomNumber));

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
            <div className="form-group">
              <label>Booking Source</label>
              <select 
                className="input-control"
                value={bookingSource}
                onChange={(e) => setBookingSource(e.target.value as Booking["bookingSource"])}
              >
                <option value="direct">Direct</option>
                <option value="agency">Agency / Third-Party</option>
              </select>
            </div>
            {bookingSource === 'agency' && (
              <div className="form-group">
                <label>Agency Commission (₹)</label>
                <input 
                  type="number" 
                  className="input-control" 
                  min="0"
                  value={agencyCommission}
                  onChange={(e) => setAgencyCommission(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 500"
                />
              </div>
            )}
          </div>

          <h3 style={{ fontSize: "0.9rem", color: "var(--primary)", textTransform: "uppercase", marginTop: "1.5rem", marginBottom: "1rem", letterSpacing: "0.05em" }}>
            2. Stay & Room Details
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }} className="mobile-stacked-grid">
            <div className="form-group">
              <label>Check-in Date *</label>
              <input 
                type="date" 
                className="input-control" 
                value={checkInDate}
                min={!booking ? localToday : undefined}
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
                min={checkInDate || (!booking ? localToday : undefined)}
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

          {/* Multi-Room Selection Section */}
          <div style={{ 
            border: "1px solid var(--card-border)", 
            borderRadius: "var(--radius-md)", 
            padding: "1rem", 
            backgroundColor: "var(--bg-secondary)", 
            marginBottom: "1.25rem" 
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <label style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                Select Room(s) * {selectedRoomNumbers.length > 0 && `(${selectedRoomNumbers.length} selected)`}
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <select 
                  className="input-control" 
                  style={{ width: "auto", fontSize: "0.8rem", padding: "0.25rem 0.5rem", margin: 0 }}
                  value={roomFilterType}
                  onChange={(e) => {
                    setRoomFilterType(e.target.value);
                    if (e.target.value !== "all") {
                      setSelectedRoomType(e.target.value);
                    }
                  }}
                >
                  <option value="all">All Room Types</option>
                  {roomTypes.map(rt => (
                    <option key={rt.id} value={rt.id}>{rt.name}</option>
                  ))}
                </select>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                  onClick={() => autoAssignRooms(roomFilterType, 1)}
                >
                  + Auto-Select Available
                </button>
              </div>
            </div>

            {!checkInDate || !checkOutDate ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>
                Please choose Check-in and Check-out dates above to view available rooms.
              </p>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", maxHeight: "180px", overflowY: "auto", padding: "0.25rem 0" }}>
                {visibleRooms.map(room => {
                  const availability = checkRoomAvailability(room.roomNumber, checkInDate, checkOutDate, booking?.bookingId || null);
                  const isSelected = selectedRoomNumbers.includes(room.roomNumber);
                  const roomTypeObj = roomTypes.find(rt => rt.id === room.roomType);

                  return (
                    <div 
                      key={room.roomNumber}
                      onClick={() => {
                        if (availability.available || isSelected) {
                          toggleRoomSelection(room.roomNumber);
                        }
                      }}
                      title={(availability.available || isSelected) ? `Room ${room.roomNumber} (${roomTypeObj?.name || room.roomType}) - ₹${roomTypeObj?.price || 0}/night` : availability.reason}
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: "8px",
                        border: isSelected ? "2px solid var(--primary)" : "1px solid var(--card-border)",
                        backgroundColor: isSelected ? "rgba(59,130,246,0.12)" : availability.available ? "var(--bg-primary)" : "var(--bg-tertiary)",
                        color: (availability.available || isSelected) ? "var(--text-primary)" : "var(--text-muted)",
                        cursor: (availability.available || isSelected) ? "pointer" : "not-allowed",
                        opacity: (availability.available || isSelected) ? 1 : 0.6,
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                        minWidth: "110px",
                        transition: "all 0.15s ease",
                        userSelect: "none"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Room {room.roomNumber}</span>
                        {isSelected && <span style={{ color: "var(--primary)", fontWeight: "bold", fontSize: "0.8rem" }}>✓</span>}
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>
                        {roomTypeObj?.name || room.roomType}
                      </span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: availability.available ? "var(--primary)" : "var(--danger)" }}>
                        {availability.available ? `₹${roomTypeObj?.price || 0}/nt` : "Unavailable"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedRoomNumbers.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--card-border)", fontSize: "0.8rem" }}>
                <span>
                  <strong>Selected:</strong> {selectedRoomNumbers.join(", ")}
                </span>
                <span style={{ color: Number(guestCount) > combinedCapacity ? "var(--danger)" : "var(--text-secondary)", fontWeight: 600 }}>
                  Capacity: {combinedCapacity} Guests {Number(guestCount) > combinedCapacity && "(Exceeded!)"}
                </span>
              </div>
            )}
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
