export interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: 'admin' | 'employee' | 'manager' | 'developer';
  status: 'active' | 'inactive';
  createdAt: {
    seconds: number;
    toDate: () => Date;
  } | null;
}

export interface Employee {
  id: string; // Matches employee_id
  employeeId: string;
  uid: string; // Matches user_id (profile id)
  fullName: string;
  email: string;
  phone?: string | null;
  role: 'admin' | 'employee' | 'manager' | 'developer';
  status: 'active' | 'inactive';
  joinedDate: string;
  notes: string;
  createdAt: {
    seconds: number;
    toDate: () => Date;
  } | null;
}

export interface RoomType {
  id: string;
  name: string;
  price: number;
  capacity: number;
  description?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
}

export interface Room {
  id: string; // Matches room_number
  roomNumber: string;
  roomType: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved' | 'dirty';
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
}

export interface Booking {
  id: string; // Matches booking_id
  bookingId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  roomType: string;
  roomNumber: string; // Comma-separated list E.g. "101, 102"
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'unpaid' | 'partial' | 'partially-paid';
  bookingStatus: 'confirmed' | 'pending' | 'checked-in' | 'checked-out' | 'cancelled';
  paymentMethod: string;
  advanceAmount: number;
  paymentProof: string;
  remarks: string;
  createdByUid?: string | null;
  createdByName?: string | null;
  createdByRole?: string | null;
  createdAt: {
    seconds: number;
    toDate: () => Date;
  } | null;
  updatedAt: {
    seconds: number;
    toDate: () => Date;
  } | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  createdAt: {
    seconds: number;
    toDate: () => Date;
  } | null;
}
