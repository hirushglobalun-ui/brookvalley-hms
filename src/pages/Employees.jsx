import React, { useState, useEffect } from "react";
import { useAuth } from "../firebase/auth";
import { 
  getEmployees, 
  addEmployee, 
  updateEmployeeDetails, 
  updateEmployeeStatus,
  getBookings 
} from "../firebase/db";
import { 
  Plus, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Edit2, 
  X, 
  Activity, 
  BookOpen, 
  Mail, 
  Phone, 
  Calendar,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";

const Employees = () => {
  const { user, registerEmployeeCredentials } = useAuth();
  
  // Data States
  const [employees, setEmployees] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal / Selection States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("employee");
  const [status, setStatus] = useState("active");
  const [joinedDate, setJoinedDate] = useState("");
  const [notes, setNotes] = useState("");

  const refreshData = async () => {
    try {
      setLoading(true);
      const [empData, bData] = await Promise.all([
        getEmployees(),
        getBookings()
      ]);
      setEmployees(empData);
      setBookings(bData);
    } catch (err) {
      console.error("Failed to load employee list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOpenCreate = () => {
    setSelectedEmployee(null);
    setFullName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setPhone("");
    setRole("employee");
    setStatus("active");
    setJoinedDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setSelectedEmployee(emp);
    setFullName(emp.fullName);
    setEmail(emp.email);
    setPassword(""); // Auth password can't be retrieved
    setShowPassword(false);
    setPhone(emp.phone);
    setRole(emp.role);
    setStatus(emp.status);
    setJoinedDate(emp.joinedDate);
    setNotes(emp.notes || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenActivity = (emp) => {
    setSelectedEmployee(emp);
    setIsActivityOpen(true);
  };

  const handleStatusToggle = async (emp) => {
    const newStatus = emp.status === "active" ? "inactive" : "active";
    const confirmMsg = `Are you sure you want to set ${emp.fullName} to ${newStatus}?` + 
      (newStatus === "inactive" ? " They will be locked out of the system immediately." : "");
      
    if (window.confirm(confirmMsg)) {
      try {
        await updateEmployeeStatus(emp.id, emp.uid, newStatus, user);
        refreshData();
      } catch (err) {
        alert("Failed to toggle status: " + err.message);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      if (selectedEmployee) {
        // EDIT MODE
        const data = {
          fullName,
          phone,
          role,
          notes
        };
        await updateEmployeeDetails(selectedEmployee.id, selectedEmployee.uid, data, user);
        setIsModalOpen(false);
        refreshData();
      } else {
        // CREATE MODE
        if (!password || password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }

        // 1. Create credentials in Firebase Auth using background App instance workaround
        const uid = await registerEmployeeCredentials(email, password);
        
        // 2. Create records in Firestore database
        const data = {
          fullName,
          email,
          phone,
          role,
          status,
          joinedDate,
          notes
        };
        await addEmployee(uid, data, user);
        
        setIsModalOpen(false);
        refreshData();
      }
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Failed to save employee.");
    } finally {
      setFormLoading(false);
    }
  };

  // Get bookings created by selected employee
  const employeeBookings = selectedEmployee 
    ? bookings.filter(b => b.createdByUid === selectedEmployee.uid)
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Title Header */}
      <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
        <div className="page-header-flex">
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Employee Management</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>Add, edit and monitor employee activity.</p>
          </div>
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <UserPlus size={16} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Employees Grid List */}
      <div className="grid-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {loading ? (
          <div className="no-data">Loading employees...</div>
        ) : employees.length > 0 ? (
          employees.map(emp => {
            const bookingsCount = bookings.filter(b => b.createdByUid === emp.uid).length;
            const initials = emp.fullName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
            
            return (
              <div key={emp.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div className="user-avatar" style={{ width: "48px", height: "48px", fontSize: "1.2rem" }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {emp.fullName}
                    </h3>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ID: {emp.employeeId}</span>
                  </div>
                  <span className={`badge badge-${emp.status === "active" ? "success" : "danger"}`}>
                    {emp.status}
                  </span>
                </div>

                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.4rem", borderTop: "1px solid var(--card-border)", paddingTop: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Mail size={14} className="text-primary" />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{emp.email}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Phone size={14} className="text-primary" />
                    <span>{emp.phone}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Calendar size={14} className="text-primary" />
                    <span>Joined: {emp.joinedDate}</span>
                  </div>
                </div>

                {emp.notes && (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", backgroundColor: "var(--bg-primary)", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--card-border)" }}>
                    "{emp.notes}"
                  </p>
                )}

                <div style={{ borderTop: "1px solid var(--card-border)", paddingTop: "0.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                    Bookings created: <strong className="text-primary">{bookingsCount}</strong>
                  </span>
                  
                  <span className="badge" style={{ backgroundColor: "var(--bg-tertiary)", textTransform: "capitalize" }}>
                    {emp.role}
                  </span>
                </div>

                {/* Actions Panel */}
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}
                    onClick={() => handleOpenActivity(emp)}
                  >
                    <BookOpen size={14} />
                    <span>Activity</span>
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: "0.5rem" }}
                    onClick={() => handleOpenEdit(emp)}
                    title="Edit Details"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    className={`btn ${emp.status === "active" ? "btn-danger" : "btn-primary"}`} 
                    style={{ padding: "0.5rem", width: "36px", height: "36px", borderRadius: "var(--radius-sm)" }}
                    onClick={() => handleStatusToggle(emp)}
                    title={emp.status === "active" ? "Deactivate Account" : "Activate Account"}
                  >
                    {emp.status === "active" ? <UserX size={14} /> : <UserCheck size={14} />}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-data" style={{ gridColumn: "span 3" }}>No employees registered.</div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content modal-content-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600 }}>
                {selectedEmployee ? `Edit Employee Details` : "Add Employee Account"}
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Login Email Address *</label>
                  <input 
                    type="email" 
                    className="input-control" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!!selectedEmployee} // Auth email can't change
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: selectedEmployee ? "span 2" : "span 1" }}>
                  <label>Phone Number *</label>
                  <input 
                    type="tel" 
                    className="input-control" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>

                {!selectedEmployee && (
                  <div className="form-group">
                    <label>Assign Password * (Min 6 chars)</label>
                    <div style={{ position: "relative" }}>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        className="input-control" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ paddingRight: "2.5rem" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: "0.75rem",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "4px"
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Role</label>
                  <select 
                    className="input-control"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="employee">Employee / Staff</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select 
                    className="input-control"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={!!selectedEmployee} // Handled separately via grid toggle
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>Joined Date</label>
                  <input 
                    type="date" 
                    className="input-control" 
                    value={joinedDate}
                    onChange={(e) => setJoinedDate(e.target.value)}
                    disabled={!!selectedEmployee}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>Notes / Notes for Employee (Optional)</label>
                  <textarea 
                    className="input-control" 
                    rows="3"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? "Saving Account..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVITY FEED MODAL */}
      {isActivityOpen && selectedEmployee && (
        <div className="modal-overlay" onClick={() => setIsActivityOpen(false)}>
          <div className="modal-content" style={{ maxWidth: "650px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: "1.2rem", fontWeight: 600, display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <Activity size={18} className="text-primary" />
                <span>Booking History: {selectedEmployee.fullName}</span>
              </h2>
              <button className="btn btn-secondary btn-icon" onClick={() => setIsActivityOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", gap: "1.5rem", padding: "0.75rem 1rem", backgroundColor: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem" }}>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Joined Date: </span>
                  <strong>{selectedEmployee.joinedDate}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Role: </span>
                  <strong style={{ textTransform: "capitalize" }}>{selectedEmployee.role}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Total Bookings: </span>
                  <strong>{employeeBookings.length}</strong>
                </div>
              </div>

              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "0.5rem" }}>Bookings Registered</h3>
              
              <div className="table-wrapper" style={{ maxHeight: "250px", overflowY: "auto" }}>
                {employeeBookings.length > 0 ? (
                  <table className="table-custom" style={{ fontSize: "0.85rem" }}>
                    <thead>
                      <tr>
                        <th>Booking ID</th>
                        <th>Room</th>
                        <th>Customer</th>
                        <th>Dates</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeBookings.map(b => (
                        <tr key={b.bookingId}>
                          <td style={{ fontFamily: "monospace" }}>{b.bookingId}</td>
                          <td>Room {b.roomNumber}</td>
                          <td>{b.customerName}</td>
                          <td style={{ fontSize: "0.75rem" }}>{b.checkInDate} to {b.checkOutDate}</td>
                          <td style={{ fontWeight: 600 }}>₹{b.totalAmount}</td>
                          <td>
                            <span className={`badge badge-${
                              b.bookingStatus === "confirmed" || b.bookingStatus === "checked-in" ? "success" : "warning"
                            }`}>
                              {b.bookingStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-data" style={{ padding: "2rem" }}>This employee has not registered any bookings.</div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setIsActivityOpen(false)}>
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
