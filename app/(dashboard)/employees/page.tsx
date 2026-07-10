"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../lib/auth";
import { 
  EmployeesService,
  EmployeeCard,
  EmployeeActivityModal,
  EmployeeFormModal
} from "../../../features/employees";
import { getBookings, formatDate } from "../../../lib/db";
import { UserPlus } from "lucide-react";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { Employee, Booking } from "../../../types";

const employeesService = new EmployeesService();

const EmployeesContent = () => {
  const { user } = useAuth();
  
  // Data States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Selection States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Load Initial Dataset
  const initialLoad = async () => {
    try {
      setLoading(true);
      const [empList, bList] = await Promise.all([
        employeesService.getEmployees(),
        getBookings()
      ]);
      setEmployees(empList);
      setBookings(bList.data);
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
  const handleSubmit = async (formData: any) => {
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
      await employeesService.addEmployee(formData, formData.password, user);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Employees</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Add, edit, or toggle access authorization for hotel staff.
          </p>
        </div>

        {user?.role === "admin" && (
          <button 
            className="btn btn-primary btn-icon"
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
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
          Loading employee records...
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
          onClose={() => setIsActivityOpen(false)}
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
