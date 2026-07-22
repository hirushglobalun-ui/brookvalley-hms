"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../lib/auth";
import { 
  EmployeesService,
  EmployeeCard,
  EmployeeActivityModal,
  EmployeeFormModal
} from "../../../features/employees";
import { BookingDetailModal } from "../../../features/bookings";
import { SettingsService } from "../../../features/settings";
import { getBookings, formatDate } from "../../../lib/db";
import { UserPlus } from "lucide-react";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { Employee, Booking } from "../../../types";
import { Skeleton } from "../../../components/ui/Skeleton";

const employeesService = new EmployeesService();
const settingsService = new SettingsService();

const EmployeesContent = () => {
  const { user } = useAuth();
  
  // Data States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Selection States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isBookingDetailOpen, setIsBookingDetailOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Load Initial Dataset
  const initialLoad = async () => {
    try {
      setLoading(true);
      const [empList, bList, rtList] = await Promise.all([
        employeesService.getEmployees(),
        getBookings(),
        settingsService.getRoomTypes()
      ]);
      setEmployees(empList);
      setBookings(bList.data);
      setRoomTypes(rtList);

    } catch (err) {
      console.error("Failed to load employees data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initialLoad();
  }, []);

  const refreshData = async () => {
    try {
      const [empList, bList] = await Promise.all([
        employeesService.getEmployees(),
        getBookings()
      ]);
      setEmployees(empList);
      setBookings(bList.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Add / Edit submission
  const handleSubmit = async (formData: any, password?: string) => {
    if (selectedEmployee) {
      // Edit mode
      await employeesService.updateEmployeeDetails(
        selectedEmployee.id,
        selectedEmployee.uid,
        formData,
        user
      );
    } else {
      // Add mode
      await employeesService.addEmployee(formData, password || "", user);
    }
    refreshData();
  };

  // Delete employee
  const handleDelete = async (employeeId: string, uid: string) => {
    await employeesService.deleteEmployee(employeeId, uid, user);
    refreshData();
  };

  // Toggle active/inactive status
  const handleToggleStatus = async (employeeId: string, uid: string, status: "active" | "inactive") => {
    await employeesService.updateEmployeeStatus(employeeId, uid, status, user);
    refreshData();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Employees</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Add, edit, or toggle access authorization for hotel staff.
          </p>
        </div>

        {(user?.role === "admin" || user?.role === "developer" || user?.role === "manager") && (
          <button 
            className="btn btn-primary"
            onClick={() => {
              setSelectedEmployee(null);
              setIsModalOpen(true);
            }}
          >
            <UserPlus size={16} /> Add Employee
          </button>
        )}
      </div>

      {/* Grid container */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <Skeleton width={48} height={48} borderRadius="50%" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <Skeleton width="60%" height={18} />
                  <Skeleton width="40%" height={12} />
                </div>
              </div>
              <Skeleton width="100%" height={36} borderRadius={8} />
            </div>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
          No employee records found.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {employees.map(emp => {
            const count = bookings.filter(b => b.createdByUid === emp.uid).length;
            return (
              <EmployeeCard 
                key={emp.id} 
                employee={emp} 
                bookingsCount={count}
                user={user}
                onEditClick={(e) => {
                  setSelectedEmployee(e);
                  setIsModalOpen(true);
                }}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
                onActivityClick={(e) => {
                  setSelectedEmployee(e);
                  setIsActivityOpen(true);
                }}
              />
            );
          })}
        </div>
      )}

      {/* Form Dialog Modal Overlay */}
      {isModalOpen && (
        <EmployeeFormModal 
          isOpen={isModalOpen}
          employee={selectedEmployee}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
        />
      )}

      {/* Activity Logs Modal Overlay */}
      {isActivityOpen && selectedEmployee && (
        <EmployeeActivityModal 
          isOpen={isActivityOpen}
          employee={selectedEmployee}
          bookings={bookings}
          formatDate={formatDate}
          onClose={() => setIsActivityOpen(false)}
          onBookingClick={(booking) => {
            setSelectedBooking(booking);
            setIsBookingDetailOpen(true);
          }}
        />
      )}

      {/* Booking Detail Modal Overlay */}
      {isBookingDetailOpen && (
        <BookingDetailModal 
          isOpen={isBookingDetailOpen}
          booking={selectedBooking}
          roomTypes={roomTypes}
          user={user}
          onClose={() => setIsBookingDetailOpen(false)}
          formatDate={formatDate}
        />
      )}
    </div>
  );
};

export default function EmployeesPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <EmployeesContent />
    </ProtectedRoute>
  );
}
