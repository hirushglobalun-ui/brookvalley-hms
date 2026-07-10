import { supabase } from "./supabase";

// --- DATE FORMATTING HELPER ---
export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

// --- TIMESTAMP COMPATIBILITY HELPERS ---
const mapTimestamp = (isoString) => {
  if (!isoString) return null;
  const date = new Date(isoString);
  return {
    seconds: Math.floor(date.getTime() / 1000),
    toDate: () => date
  };
};

// --- MAPPERS ---
const mapEmployeeFromDb = (e) => {
  if (!e) return null;
  return {
    id: e.employee_id, // matching Firestore doc.id
    employeeId: e.employee_id,
    uid: e.user_id,
    fullName: e.full_name,
    email: e.email,
    phone: e.phone,
    role: e.role,
    status: e.status,
    joinedDate: e.joined_date,
    notes: e.notes || "",
    createdAt: mapTimestamp(e.created_at)
  };
};

const mapRoomTypeFromDb = (rt) => {
  if (!rt) return null;
  return {
    id: rt.id,
    name: rt.name,
    price: Number(rt.price),
    capacity: Number(rt.capacity),
    description: rt.description
  };
};

const mapRoomFromDb = (r) => {
  if (!r) return null;
  return {
    id: r.room_number, // matching doc.id
    roomNumber: r.room_number,
    roomType: r.room_type_id,
    status: r.status
  };
};

const mapBookingFromDb = (b) => {
  if (!b) return null;
  return {
    id: b.booking_id, // matching doc.id
    bookingId: b.booking_id,
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    customerEmail: b.customer_email,
    customerAddress: b.customer_address || "",
    roomType: b.room_type_id,
    roomNumber: b.room_number,
    checkInDate: b.check_in_date,
    checkOutDate: b.check_out_date,
    guestCount: Number(b.guest_count),
    totalAmount: Number(b.total_amount),
    paymentStatus: b.payment_status,
    bookingStatus: b.booking_status,
    paymentMethod: b.payment_method,
    advanceAmount: Number(b.advance_amount || 0),
    paymentProof: b.payment_proof || "",
    remarks: b.remarks || "",
    createdByUid: b.created_by_uid,
    createdByName: b.created_by_name,
    createdByRole: b.created_by_role,
    createdAt: mapTimestamp(b.created_at),
    updatedAt: mapTimestamp(b.updated_at)
  };
};

const mapActivityLogFromDb = (log) => {
  if (!log) return null;
  return {
    id: log.id,
    action: log.action,
    details: log.details,
    userId: log.user_id,
    userName: log.user_name,
    userRole: log.user_role,
    createdAt: mapTimestamp(log.created_at)
  };
};

// --- DB SERVICE OPERATIONS ---

// --- HELPERS & LOGGING ---
export const logActivity = async (action, details, user) => {
  try {
    await supabase.from("activity_logs").insert({
      action,
      details,
      user_id: user?.uid || null,
      user_name: user?.fullName || user?.email || "System",
      user_role: user?.role || "system"
    });
  } catch (err) {
    console.error("Failed to write activity log:", err);
  }
};

// --- USERS & EMPLOYEES ---
export const getEmployees = async () => {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("created_at", { ascending: false });
    
  if (error) throw error;
  return data.map(mapEmployeeFromDb);
};

export const getEmployeeByUid = async (uid) => {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) throw error;
  return mapEmployeeFromDb(data);
};

/**
 * Creates user credentials and record in one transaction database-side via RPC.
 */
export const addEmployee = async (employeeData, password, adminUser) => {
  const { data: employeeId, error } = await supabase.rpc("create_employee_user", {
    p_email: employeeData.email,
    p_password: password,
    p_full_name: employeeData.fullName,
    p_phone: employeeData.phone,
    p_role: employeeData.role,
    p_status: employeeData.status || "active",
    p_joined_date: employeeData.joinedDate || new Date().toISOString().split("T")[0],
    p_notes: employeeData.notes || ""
  });

  if (error) throw error;

  await logActivity(
    "CREATE_EMPLOYEE",
    `Created employee ${employeeData.fullName} (${employeeData.role})`,
    adminUser
  );

  return employeeId;
};

export const updateEmployeeStatus = async (employeeId, uid, status, adminUser) => {
  const { error: empError } = await supabase
    .from("employees")
    .update({ status })
    .eq("employee_id", employeeId);

  if (empError) throw empError;

  const { error: profError } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", uid);

  if (profError) throw profError;

  await logActivity(
    "UPDATE_EMPLOYEE_STATUS",
    `Updated status of employee ${employeeId} to ${status}`,
    adminUser
  );
};

export const updateEmployeeDetails = async (employeeId, uid, employeeData, adminUser) => {
  const { error: empError } = await supabase
    .from("employees")
    .update({
      full_name: employeeData.fullName,
      phone: employeeData.phone,
      role: employeeData.role,
      notes: employeeData.notes || ""
    })
    .eq("employee_id", employeeId);

  if (empError) throw empError;

  const { error: profError } = await supabase
    .from("profiles")
    .update({
      full_name: employeeData.fullName,
      phone: employeeData.phone,
      role: employeeData.role
    })
    .eq("id", uid);

  if (profError) throw profError;

  await logActivity(
    "UPDATE_EMPLOYEE",
    `Updated employee ${employeeData.fullName} details`,
    adminUser
  );
};

export const deleteEmployee = async (employeeId, uid, adminUser) => {
  const { error } = await supabase.rpc("delete_employee_user", {
    p_uid: uid
  });

  if (error) throw error;

  await logActivity(
    "DELETE_EMPLOYEE",
    `Deleted employee account ${employeeId}`,
    adminUser
  );
};

// --- ROOM TYPES & ROOMS ---
export const getRoomTypes = async () => {
  const { data, error } = await supabase
    .from("room_types")
    .select("*")
    .order("id");

  if (error) throw error;
  return data.map(mapRoomTypeFromDb);
};

export const addRoomType = async (roomTypeData, adminUser) => {
  const { id, name, price, capacity, description } = roomTypeData;
  const { error } = await supabase.from("room_types").insert({
    id,
    name,
    price: Number(price),
    capacity: Number(capacity),
    description
  });

  if (error) throw error;

  await logActivity("CREATE_ROOM_TYPE", `Created room type ${name}`, adminUser);
};

export const updateRoomType = async (id, roomTypeData, adminUser) => {
  const { name, price, capacity, description } = roomTypeData;
  const { error } = await supabase
    .from("room_types")
    .update({
      name,
      price: Number(price),
      capacity: Number(capacity),
      description,
      updated_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) throw error;

  await logActivity("UPDATE_ROOM_TYPE", `Updated room type ${name}`, adminUser);
};

export const deleteRoomType = async (id, name, adminUser) => {
  // Deleting room type cascade deletes associated rooms in DB schema
  const { error } = await supabase.from("room_types").delete().eq("id", id);

  if (error) throw error;

  await logActivity("DELETE_ROOM_TYPE", `Deleted room type ${name} and associated rooms`, adminUser);
};

export const getRooms = async () => {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .order("room_number");

  if (error) throw error;
  return data.map(mapRoomFromDb);
};

export const addRoom = async (roomData, adminUser) => {
  const { roomNumber, roomType, status } = roomData;
  const { error } = await supabase.from("rooms").insert({
    room_number: roomNumber,
    room_type_id: roomType,
    status
  });

  if (error) throw error;

  await logActivity("CREATE_ROOM", `Added room ${roomNumber} (${roomType})`, adminUser);
};

export const updateRoomStatus = async (roomNumber, status, adminUser) => {
  const { error } = await supabase
    .from("rooms")
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq("room_number", roomNumber);

  if (error) throw error;

  await logActivity("UPDATE_ROOM_STATUS", `Updated room ${roomNumber} to ${status}`, adminUser);
};

export const deleteRoom = async (roomNumber, adminUser) => {
  const { error } = await supabase.from("rooms").delete().eq("room_number", roomNumber);

  if (error) throw error;

  await logActivity("DELETE_ROOM", `Deleted room ${roomNumber}`, adminUser);
};

export const updateRoom = async (oldRoomNumber, roomData, adminUser) => {
  const { roomNumber, roomType, status } = roomData;
  const { error } = await supabase
    .from("rooms")
    .update({
      room_number: roomNumber,
      room_type_id: roomType,
      status,
      updated_at: new Date().toISOString()
    })
    .eq("room_number", oldRoomNumber);

  if (error) throw error;

  await logActivity("UPDATE_ROOM", `Updated room ${oldRoomNumber} to ${roomNumber} (${roomType})`, adminUser);
};

// --- BOOKINGS ---
export const getBookings = async () => {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data.map(mapBookingFromDb);
};

export const addBooking = async (bookingData, user) => {
  const bookingId = "BK" + Math.floor(100000 + Math.random() * 900000);
  
  const insertData = {
    booking_id: bookingId,
    customer_name: bookingData.customerName,
    customer_phone: bookingData.customerPhone,
    customer_email: bookingData.customerEmail,
    customer_address: bookingData.customerAddress || "",
    room_type_id: bookingData.roomType,
    room_number: bookingData.roomNumber,
    check_in_date: bookingData.checkInDate,
    check_out_date: bookingData.checkOutDate,
    guest_count: Number(bookingData.guestCount),
    total_amount: Number(bookingData.totalAmount),
    payment_status: bookingData.paymentStatus,
    booking_status: bookingData.bookingStatus || "confirmed",
    payment_method: bookingData.paymentMethod || "none",
    advance_amount: Number(bookingData.advanceAmount || 0),
    payment_proof: bookingData.paymentProof || "",
    remarks: bookingData.remarks || "",
    created_by_uid: user.uid,
    created_by_name: user.fullName || user.email,
    created_by_role: user.role
  };

  const { error } = await supabase.from("bookings").insert(insertData);
  if (error) throw error;

  // Occupy room if check-in is today and status is checked-in
  const todayStr = new Date().toISOString().split("T")[0];
  if (bookingData.checkInDate <= todayStr && bookingData.checkOutDate >= todayStr && bookingData.bookingStatus === "checked-in") {
    const roomsToOccupy = bookingData.roomNumber.split(",").map(r => r.trim());
    for (const rm of roomsToOccupy) {
      if (rm) {
        await updateRoomStatus(rm, "occupied", user);
      }
    }
  }

  await logActivity(
    "CREATE_BOOKING",
    `Created booking ${bookingId} for Room(s) ${bookingData.roomNumber} (${bookingData.customerName})`,
    user
  );

  return bookingId;
};

export const updateBooking = async (bookingId, bookingData, user) => {
  // Fetch previous rooms first to release
  const { data: oldBooking, error: fetchErr } = await supabase
    .from("bookings")
    .select("room_number")
    .eq("booking_id", bookingId)
    .maybeSingle();

  let oldRooms = [];
  if (oldBooking?.room_number) {
    oldRooms = oldBooking.room_number.split(",").map(r => r.trim());
  }

  const updateData = {
    customer_name: bookingData.customerName,
    customer_phone: bookingData.customerPhone,
    customer_email: bookingData.customerEmail,
    customer_address: bookingData.customerAddress || "",
    room_type_id: bookingData.roomType,
    room_number: bookingData.roomNumber,
    check_in_date: bookingData.checkInDate,
    check_out_date: bookingData.checkOutDate,
    guest_count: Number(bookingData.guestCount),
    total_amount: Number(bookingData.totalAmount),
    payment_status: bookingData.paymentStatus,
    booking_status: bookingData.bookingStatus,
    payment_method: bookingData.paymentMethod || "none",
    advance_amount: Number(bookingData.advanceAmount || 0),
    payment_proof: bookingData.paymentProof || "",
    remarks: bookingData.remarks || "",
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("bookings").update(updateData).eq("booking_id", bookingId);
  if (error) throw error;

  // Handle room status release/occupation
  if (bookingData.bookingStatus === "checked-in") {
    // Release old rooms
    for (const rm of oldRooms) {
      if (rm) await updateRoomStatus(rm, "available", user);
    }
    // Occupy new rooms
    const newRooms = bookingData.roomNumber.split(",").map(r => r.trim());
    for (const rm of newRooms) {
      if (rm) await updateRoomStatus(rm, "occupied", user);
    }
  } else if (bookingData.bookingStatus === "checked-out" || bookingData.bookingStatus === "cancelled") {
    // Release old rooms
    for (const rm of oldRooms) {
      if (rm) await updateRoomStatus(rm, "available", user);
    }
    // Release current rooms
    const newRooms = bookingData.roomNumber.split(",").map(r => r.trim());
    for (const rm of newRooms) {
      if (rm) await updateRoomStatus(rm, "available", user);
    }
  }

  await logActivity(
    "UPDATE_BOOKING",
    `Updated booking ${bookingId} (Room(s) ${bookingData.roomNumber})`,
    user
  );
};

export const deleteBooking = async (bookingId, roomNumber, user) => {
  const { error } = await supabase.from("bookings").delete().eq("booking_id", bookingId);
  if (error) throw error;

  if (roomNumber) {
    const roomsToRelease = roomNumber.split(",").map(r => r.trim());
    for (const rm of roomsToRelease) {
      if (rm) {
        await updateRoomStatus(rm, "available", user);
      }
    }
  }

  await logActivity("DELETE_BOOKING", `Deleted booking ${bookingId}`, user);
};

// --- SYSTEM INITIALIZATION / SEEDING ---
export const seedInitialData = async (force = false) => {
  // Checks if seeded
  const { data: existingTypes } = await supabase.from("room_types").select("id").limit(1);
  if (existingTypes && existingTypes.length > 0 && !force) {
    return false;
  }

  if (force) {
    // Cascade constraints automatically clear rooms when room_types are deleted
    await supabase.from("room_types").delete().neq("id", "placeholder_never_match");
  }

  // 1. Seed Room Types
  const roomTypes = [
    { id: "hut-room", name: "Hut Room", price: 90, capacity: 2, description: "Rustic traditional hut offering basic nature stay amenities." },
    { id: "pool-view-deluxe", name: "Pool View Deluxe Room", price: 160, capacity: 2, description: "Deluxe room with balcony overlooking the primary swimming pool." },
    { id: "stream-view-deluxe", name: "Stream View Deluxe Room", price: 180, capacity: 2, description: "Premium room alongside the flowing mountain stream." },
    { id: "3bh-villa", name: "3bh Villa", price: 350, capacity: 6, description: "Spacious three bedroom family villa with kitchen." },
    { id: "3bh-premium-villa", name: "3bh Premium Villa", price: 480, capacity: 8, description: "Luxury three bedroom villa with private plunge pool and garden." }
  ];

  const { error: typeErr } = await supabase.from("room_types").insert(roomTypes);
  if (typeErr) throw typeErr;

  // 2. Seed Rooms
  const rooms = [
    { room_number: "101", room_type_id: "hut-room", status: "available" },
    { room_number: "102", room_type_id: "hut-room", status: "available" },
    { room_number: "103", room_type_id: "hut-room", status: "available" },
    { room_number: "201", room_type_id: "pool-view-deluxe", status: "available" },
    { room_number: "202", room_type_id: "pool-view-deluxe", status: "available" },
    { room_number: "203", room_type_id: "pool-view-deluxe", status: "available" },
    { room_number: "301", room_type_id: "stream-view-deluxe", status: "available" },
    { room_number: "302", room_type_id: "stream-view-deluxe", status: "available" },
    { room_number: "401", room_type_id: "3bh-villa", status: "available" },
    { room_number: "501", room_type_id: "3bh-premium-villa", status: "available" }
  ];

  const { error: roomErr } = await supabase.from("rooms").insert(rooms);
  if (roomErr) throw roomErr;

  return true;
};

export const createFirstAdminUser = async (uid, email, fullName) => {
  // In Supabase, the handle_new_user trigger automatically copies the new auth user to profiles and employees.
  // We can just verify or explicitly write to profiles and employees as a fallback if the trigger didn't fire.
  const profileData = {
    id: uid,
    full_name: fullName,
    email: email,
    phone: "+1 555-0199",
    role: "admin",
    status: "active"
  };

  const employeeData = {
    employee_id: "EMP888888",
    user_id: uid,
    full_name: fullName,
    email: email,
    phone: "+1 555-0199",
    role: "admin",
    status: "active",
    joined_date: new Date().toISOString().split("T")[0],
    notes: "System Administrator"
  };

  // Upsert to profiles
  await supabase.from("profiles").upsert(profileData);
  // Upsert to employees
  await supabase.from("employees").upsert(employeeData);

  await logActivity("INITIALIZE_SYSTEM", "System initialized with primary admin user", {
    uid,
    fullName,
    role: "admin"
  });
};

export const getActivityLogs = async (limitCount = 10) => {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limitCount);

  if (error) throw error;
  return data.map(mapActivityLogFromDb);
};

// --- RESET UTILITIES ---
export const clearAllBookings = async (adminUser) => {
  // Delete all bookings
  const { error: deleteErr } = await supabase.from("bookings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteErr) throw deleteErr;

  // Reset all room statuses to available
  const { error: updateErr } = await supabase.from("rooms").update({ status: "available" }).neq("status", "available");
  if (updateErr) throw updateErr;

  await logActivity("CLEAR_ALL_BOOKINGS", "Cleared all bookings records and reset room availability status", adminUser);
};

export const clearAllEmployees = async (adminUser) => {
  // Delete employees other than self (will delete matching profiles cascade)
  const { error } = await supabase
    .from("profiles")
    .delete()
    .neq("id", adminUser.uid)
    .neq("role", "admin"); // protect other admins as well

  if (error) throw error;

  await logActivity("CLEAR_ALL_EMPLOYEES", "Cleared all employee records (excluding self)", adminUser);
};

export const clearAllRoomTypes = async (adminUser) => {
  // Cascade constraints delete all rooms automatically
  const { error } = await supabase.from("room_types").delete().neq("id", "placeholder_never_match");
  if (error) throw error;

  await logActivity("CLEAR_ALL_ROOM_TYPES", "Cleared all room types and rooms configurations", adminUser);
};
