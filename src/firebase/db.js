import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "./config";

// --- HELPERS & LOGGING ---
export const logActivity = async (action, details, user) => {
  try {
    await addDoc(collection(db, "activityLogs"), {
      action,
      details,
      userId: user?.uid || "system",
      userName: user?.fullName || "System",
      userRole: user?.role || "system",
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Failed to write activity log:", err);
  }
};

// --- USERS & EMPLOYEES ---
export const getEmployees = async () => {
  const querySnapshot = await getDocs(collection(db, "employees"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getEmployeeByUid = async (uid) => {
  const querySnapshot = await getDocs(query(collection(db, "employees"), where("uid", "==", uid)));
  if (!querySnapshot.empty) {
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
  }
  return null;
};

export const addEmployee = async (uid, employeeData, adminUser) => {
  const employeeId = "EMP" + Math.floor(100000 + Math.random() * 900000);
  const newEmployee = {
    employeeId,
    uid,
    fullName: employeeData.fullName,
    email: employeeData.email,
    phone: employeeData.phone,
    role: employeeData.role,
    status: employeeData.status || "active",
    joinedDate: employeeData.joinedDate || new Date().toISOString().split("T")[0],
    notes: employeeData.notes || ""
  };

  const newUser = {
    uid,
    fullName: employeeData.fullName,
    email: employeeData.email,
    phone: employeeData.phone,
    role: employeeData.role,
    status: employeeData.status || "active",
    createdAt: serverTimestamp()
  };

  // Perform writes to users and employees collections
  await setDoc(doc(db, "users", uid), newUser);
  await setDoc(doc(db, "employees", employeeId), newEmployee);
  
  await logActivity(
    "CREATE_EMPLOYEE", 
    `Created employee ${employeeData.fullName} (${employeeData.role})`, 
    adminUser
  );
  
  return employeeId;
};

export const updateEmployeeStatus = async (employeeId, uid, status, adminUser) => {
  await updateDoc(doc(db, "employees", employeeId), { status });
  await updateDoc(doc(db, "users", uid), { status });
  
  await logActivity(
    "UPDATE_EMPLOYEE_STATUS", 
    `Updated status of employee ${employeeId} to ${status}`, 
    adminUser
  );
};

export const updateEmployeeDetails = async (employeeId, uid, employeeData, adminUser) => {
  const updateData = {
    fullName: employeeData.fullName,
    phone: employeeData.phone,
    notes: employeeData.notes || "",
    role: employeeData.role
  };

  await updateDoc(doc(db, "employees", employeeId), updateData);
  await updateDoc(doc(db, "users", uid), {
    fullName: employeeData.fullName,
    phone: employeeData.phone,
    role: employeeData.role
  });

  await logActivity(
    "UPDATE_EMPLOYEE", 
    `Updated employee ${employeeData.fullName} details`, 
    adminUser
  );
};

// --- ROOM TYPES & ROOMS ---
export const getRoomTypes = async () => {
  const querySnapshot = await getDocs(collection(db, "roomTypes"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addRoomType = async (roomTypeData, adminUser) => {
  const { id, name, price, capacity, description } = roomTypeData;
  await setDoc(doc(db, "roomTypes", id), {
    name,
    price: Number(price),
    capacity: Number(capacity),
    description
  });
  await logActivity("CREATE_ROOM_TYPE", `Created room type ${name}`, adminUser);
};

export const updateRoomType = async (id, roomTypeData, adminUser) => {
  const { name, price, capacity, description } = roomTypeData;
  await updateDoc(doc(db, "roomTypes", id), {
    name,
    price: Number(price),
    capacity: Number(capacity),
    description
  });
  await logActivity("UPDATE_ROOM_TYPE", `Updated room type ${name}`, adminUser);
};


export const deleteRoomType = async (id, name, adminUser) => {
  // Delete the room type document
  await deleteDoc(doc(db, "roomTypes", id));
  
  // Delete all associated rooms
  const roomsRef = collection(db, "rooms");
  const q = query(roomsRef, where("roomType", "==", id));
  const roomsSnapshot = await getDocs(q);
  
  const batch = writeBatch(db);
  roomsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  await logActivity("DELETE_ROOM_TYPE", `Deleted room type ${name} and associated rooms`, adminUser);
};

export const getRooms = async () => {
  const roomsSnapshot = await getDocs(collection(db, "rooms"));
  let rooms = roomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  try {
    const typesSnapshot = await getDocs(collection(db, "roomTypes"));
    const roomTypes = typesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Database check & clean: Make sure there's strictly only 1 room per roomType
    const grouped = {};
    rooms.forEach(r => {
      if (!grouped[r.roomType]) grouped[r.roomType] = [];
      grouped[r.roomType].push(r);
    });

    const toDelete = [];
    Object.keys(grouped).forEach(type => {
      const list = grouped[type];
      if (list.length > 1) {
        list.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
        // Keep the first room, prepare others for deletion
        for (let i = 1; i < list.length; i++) {
          toDelete.push(list[i].roomNumber);
        }
      }
    });

    if (toDelete.length > 0) {
      const batch = writeBatch(db);
      toDelete.forEach(roomNo => {
        batch.delete(doc(db, "rooms", roomNo));
      });
      await batch.commit();
      
      const refSnapshot = await getDocs(collection(db, "rooms"));
      rooms = refSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    const missingTypes = roomTypes.filter(rt => !rooms.some(r => r.roomType === rt.id));
    
    if (missingTypes.length > 0) {
      const batch = writeBatch(db);
      for (const rt of missingTypes) {
        const prefix = rt.id.toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 4);
        const roomNo = `${prefix}-101`;
        batch.set(doc(db, "rooms", roomNo), {
          roomNumber: roomNo,
          roomType: rt.id,
          status: "available"
        });
      }
      await batch.commit();
      
      const finalSnapshot = await getDocs(collection(db, "rooms"));
      return finalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  } catch (err) {
    console.error("Error in getRooms cleanup and seeding:", err);
  }
  
  return rooms;
};

export const addRoom = async (roomData, adminUser) => {
  const { roomNumber, roomType, status } = roomData;
  await setDoc(doc(db, "rooms", roomNumber), {
    roomNumber,
    roomType,
    status
  });
  await logActivity("CREATE_ROOM", `Added room ${roomNumber} (${roomType})`, adminUser);
};

export const updateRoomStatus = async (roomNumber, status, adminUser) => {
  await updateDoc(doc(db, "rooms", roomNumber), { status });
  await logActivity("UPDATE_ROOM_STATUS", `Updated room ${roomNumber} to ${status}`, adminUser);
};

export const deleteRoom = async (roomNumber, adminUser) => {
  await deleteDoc(doc(db, "rooms", roomNumber));
  await logActivity("DELETE_ROOM", `Deleted room ${roomNumber}`, adminUser);
};

// --- BOOKINGS ---
export const getBookings = async () => {
  const querySnapshot = await getDocs(collection(db, "bookings"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addBooking = async (bookingData, user) => {
  const bookingId = "BK" + Math.floor(100000 + Math.random() * 900000);
  const newBooking = {
    bookingId,
    customerName: bookingData.customerName,
    customerPhone: bookingData.customerPhone,
    customerEmail: bookingData.customerEmail,
    customerAddress: bookingData.customerAddress || "",
    roomType: bookingData.roomType,
    roomNumber: bookingData.roomNumber,
    checkInDate: bookingData.checkInDate,
    checkOutDate: bookingData.checkOutDate,
    guestCount: Number(bookingData.guestCount),
    totalAmount: Number(bookingData.totalAmount),
    paymentStatus: bookingData.paymentStatus,
    bookingStatus: bookingData.bookingStatus || "confirmed",
    paymentMethod: bookingData.paymentMethod || "none",
    advanceAmount: Number(bookingData.advanceAmount || 0),
    paymentProof: bookingData.paymentProof || "",
    remarks: bookingData.remarks || "",
    createdByUid: user.uid,
    createdByName: user.fullName || user.email,
    createdByRole: user.role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, "bookings", bookingId), newBooking);
  
  // Update room status to occupied if check-in is today
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
  // Fetch previous rooms to release them if they changed or checked out
  const oldBookingDoc = await getDoc(doc(db, "bookings", bookingId));
  let oldRooms = [];
  if (oldBookingDoc.exists()) {
    const oldData = oldBookingDoc.data();
    if (oldData.roomNumber) {
      oldRooms = oldData.roomNumber.split(",").map(r => r.trim());
    }
  }

  const updateData = {
    customerName: bookingData.customerName,
    customerPhone: bookingData.customerPhone,
    customerEmail: bookingData.customerEmail,
    customerAddress: bookingData.customerAddress || "",
    roomType: bookingData.roomType,
    roomNumber: bookingData.roomNumber,
    checkInDate: bookingData.checkInDate,
    checkOutDate: bookingData.checkOutDate,
    guestCount: Number(bookingData.guestCount),
    totalAmount: Number(bookingData.totalAmount),
    paymentStatus: bookingData.paymentStatus,
    bookingStatus: bookingData.bookingStatus,
    paymentMethod: bookingData.paymentMethod || "none",
    advanceAmount: Number(bookingData.advanceAmount || 0),
    paymentProof: bookingData.paymentProof || "",
    remarks: bookingData.remarks || "",
    updatedAt: serverTimestamp()
  };

  await updateDoc(doc(db, "bookings", bookingId), updateData);

  // Update room status accordingly
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
    // Release current rooms just in case
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
  await deleteDoc(doc(db, "bookings", bookingId));
  // Set rooms back to available if occupied
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

export const deleteEmployee = async (employeeId, uid, adminUser) => {
  await deleteDoc(doc(db, "employees", employeeId));
  await deleteDoc(doc(db, "users", uid));
  await logActivity("DELETE_EMPLOYEE", `Deleted employee account ${employeeId}`, adminUser);
};

// --- SYSTEM INITIALIZATION / SEEDING ---
export const seedInitialData = async (force = false) => {
  // Check if room types already exist
  const roomTypesSnapshot = await getDocs(collection(db, "roomTypes"));
  if (!roomTypesSnapshot.empty && !force) {
    return false; // Already seeded
  }

  // Clear existing collections if forcing
  if (force) {
    const roomsSnapshot = await getDocs(collection(db, "rooms"));
    const deleteBatch = writeBatch(db);
    roomsSnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
    roomTypesSnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();
  }

  const batch = writeBatch(db);

  // 1. Seed Room Types
  const roomTypes = [
    { id: "hut-room", name: "Hut Room", price: 90, capacity: 2, description: "Rustic traditional hut offering basic nature stay amenities." },
    { id: "pool-view-deluxe", name: "Pool View Deluxe Room", price: 160, capacity: 2, description: "Deluxe room with balcony overlooking the primary swimming pool." },
    { id: "stream-view-deluxe", name: "Stream View Deluxe Room", price: 180, capacity: 2, description: "Premium room alongside the flowing mountain stream." },
    { id: "3bh-villa", name: "3bh Villa", price: 350, capacity: 6, description: "Spacious three bedroom family villa with kitchen." },
    { id: "3bh-premium-villa", name: "3bh Premium Villa", price: 480, capacity: 8, description: "Luxury three bedroom villa with private plunge pool and garden." }
  ];

  roomTypes.forEach(rt => {
    batch.set(doc(db, "roomTypes", rt.id), rt);
  });

  // 2. Seed Rooms
  const rooms = [
    { roomNumber: "101", roomType: "hut-room", status: "available" },
    { roomNumber: "102", roomType: "hut-room", status: "available" },
    { roomNumber: "103", roomType: "hut-room", status: "available" },
    { roomNumber: "201", roomType: "pool-view-deluxe", status: "available" },
    { roomNumber: "202", roomType: "pool-view-deluxe", status: "available" },
    { roomNumber: "203", roomType: "pool-view-deluxe", status: "available" },
    { roomNumber: "301", roomType: "stream-view-deluxe", status: "available" },
    { roomNumber: "302", roomType: "stream-view-deluxe", status: "available" },
    { roomNumber: "401", roomType: "3bh-villa", status: "available" },
    { roomNumber: "501", roomType: "3bh-premium-villa", status: "available" }
  ];

  rooms.forEach(rm => {
    batch.set(doc(db, "rooms", rm.roomNumber), rm);
  });

  await batch.commit();
  return true;
};

export const createFirstAdminUser = async (uid, email, fullName) => {
  const adminUser = {
    uid,
    fullName,
    email,
    phone: "+1 555-0199",
    role: "admin",
    status: "active",
    createdAt: serverTimestamp()
  };

  const adminEmployee = {
    employeeId: "EMP888888",
    uid,
    fullName,
    email,
    phone: "+1 555-0199",
    role: "admin",
    status: "active",
    joinedDate: new Date().toISOString().split("T")[0],
    notes: "System Administrator"
  };

  await setDoc(doc(db, "users", uid), adminUser);
  await setDoc(doc(db, "employees", "EMP888888"), adminEmployee);
  await logActivity("INITIALIZE_SYSTEM", "System initialized with primary admin user", adminUser);
};

export const getActivityLogs = async (limitCount = 10) => {
  const querySnapshot = await getDocs(
    query(collection(db, "activityLogs"), orderBy("createdAt", "desc"), limit(limitCount))
  );
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const clearAllBookings = async (adminUser) => {
  const bookingsRef = collection(db, "bookings");
  const snapshot = await getDocs(bookingsRef);
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  // Reset all room statuses back to available
  const roomsRef = collection(db, "rooms");
  const roomsSnapshot = await getDocs(roomsRef);
  roomsSnapshot.docs.forEach(d => {
    batch.update(d.ref, { status: "available" });
  });
  
  await batch.commit();
  await logActivity("CLEAR_ALL_BOOKINGS", "Cleared all bookings records and reset room availability status", adminUser);
};

export const clearAllEmployees = async (adminUser) => {
  const employeesRef = collection(db, "employees");
  const snapshot = await getDocs(employeesRef);
  const batch = writeBatch(db);
  snapshot.docs.forEach(employeeDoc => {
    // Exclude the current admin to prevent lockout
    if (employeeDoc.id !== adminUser.uid) {
      batch.delete(employeeDoc.ref);
      batch.delete(doc(db, "users", employeeDoc.id));
    }
  });
  await batch.commit();
  await logActivity("CLEAR_ALL_EMPLOYEES", "Cleared all employee records (excluding self)", adminUser);
};

export const clearAllRoomTypes = async (adminUser) => {
  const batch = writeBatch(db);
  const typesSnapshot = await getDocs(collection(db, "roomTypes"));
  typesSnapshot.docs.forEach(d => {
    batch.delete(d.ref);
  });
  
  const roomsSnapshot = await getDocs(collection(db, "rooms"));
  roomsSnapshot.docs.forEach(d => {
    batch.delete(d.ref);
  });
  
  await batch.commit();
  await logActivity("CLEAR_ALL_ROOM_TYPES", "Cleared all room types and rooms configurations", adminUser);
};
