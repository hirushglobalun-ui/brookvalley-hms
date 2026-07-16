/**
 * Centralized database service facade for the Brookvalley Hotel Management System.
 * Delegates calls to specific modular domain services to maintain full backward compatibility.
 */

import { EmployeesService } from "../features/employees";
import { SettingsService } from "../features/settings";
import { BookingsService } from "../features/bookings";

export { formatDate } from "./dateUtils";
export { logActivity, getActivityLogs, clearAllLogs } from "../services/activityService";

const empService = new EmployeesService();
const settingsService = new SettingsService();
const bookingsService = new BookingsService();

// --- Employees Compatibility Layer ---
export const getEmployees = () => empService.getEmployees();
export const getEmployeeByUid = (uid: string) => empService.getEmployeeByUid(uid);
export const addEmployee = (dto: any, pw: string, actor: any) => empService.addEmployee(dto, pw, actor);
export const updateEmployeeStatus = (employeeId: string, uid: string, status: any, actor: any) => 
  empService.updateEmployeeStatus(employeeId, uid, status, actor);
export const updateEmployeeDetails = (employeeId: string, uid: string, dto: any, actor: any) => 
  empService.updateEmployeeDetails(employeeId, uid, dto, actor);
export const deleteEmployee = (employeeId: string, uid: string, actor: any) => 
  empService.deleteEmployee(employeeId, uid, actor);
export const clearAllEmployees = (actor: any) => empService.clearAllEmployees(actor);
export const createFirstAdminUser = (uid: string, email: string, fullName: string) => 
  empService.createFirstAdminUser(uid, email, fullName);

// --- Settings/Rooms Compatibility Layer ---
export const getRoomTypes = () => settingsService.getRoomTypes();
export const addRoomType = (dto: any, actor: any) => settingsService.addRoomType(dto, actor);
export const updateRoomType = (id: string, dto: any, actor: any) => settingsService.updateRoomType(id, dto, actor);
export const deleteRoomType = (id: string, name: string, actor: any) => settingsService.deleteRoomType(id, name, actor);
export const getRooms = () => settingsService.getRooms();
export const addRoom = (dto: any, actor: any) => settingsService.addRoom(dto, actor);
export const updateRoomStatus = (roomNumber: string, status: any, actor: any) => 
  settingsService.updateRoomStatus(roomNumber, status, actor);
export const deleteRoom = (roomNumber: string, actor: any) => settingsService.deleteRoom(roomNumber, actor);
export const updateRoom = (oldRoomNumber: string, dto: any, actor: any) => 
  settingsService.updateRoom(oldRoomNumber, dto, actor);
export const clearAllRoomTypes = (actor: any) => settingsService.clearAllRoomTypes(actor);
export const seedInitialData = (force?: boolean) => settingsService.seedInitialData(force);

// --- Bookings Compatibility Layer ---
export const getBookings = () => bookingsService.getBookings();
export const addBooking = (dto: any, actor: any) => bookingsService.addBooking(dto, actor);
export const updateBooking = (bookingId: string, dto: any, actor: any) => bookingsService.updateBooking(bookingId, dto, actor);
export const deleteBooking = (bookingId: string, roomNumber: string, actor: any) => 
  bookingsService.deleteBooking(bookingId, roomNumber, actor);
export const clearAllBookings = (actor: any) => bookingsService.clearAllBookings(actor);
