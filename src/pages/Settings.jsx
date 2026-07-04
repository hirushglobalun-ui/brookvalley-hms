import React, { useState, useEffect } from "react";
import { useAuth } from "../firebase/auth";
import {
  getRooms,
  getRoomTypes,
  addRoomType,
  updateRoomType,
  deleteRoomType
} from "../firebase/db";
import {
  Plus,
  Trash2,
  BedDouble,
  Lock,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  IndianRupee,
  Users2,
  FileText,
  Tag,
  KeyRound,
  Mail,
  Pencil,
  X,
  Check,
  Loader2
} from "lucide-react";
import { updateEmail, updatePassword } from "firebase/auth";
import { updateDoc, doc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase/config";

// Tiny spinner component
const Spinner = ({ size = 15, color = "currentColor" }) => (
  <svg
    width={size} height={size}
    viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const Settings = () => {
  const { user } = useAuth();

  const [rooms, setRooms]         = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("types");

  // Add Form
  const [rtId, setRtId]               = useState("");
  const [rtName, setRtName]           = useState("");
  const [rtPrice, setRtPrice]         = useState("");
  const [rtCapacity, setRtCapacity]   = useState(2);
  const [rtDescription, setRtDescription] = useState("");
  const [rtError, setRtError]         = useState("");
  const [rtSuccess, setRtSuccess]     = useState("");
  const [rtAdding, setRtAdding]       = useState(false);

  // Edit state — stores { id, name, price, capacity, description } or null
  const [editingId, setEditingId]     = useState(null);
  const [editFields, setEditFields]   = useState({});
  const [editSaving, setEditSaving]   = useState(false);
  const [editError, setEditError]     = useState("");
  const [deletingId, setDeletingId]   = useState(null);

  // Security Form
  const [securityEmail, setSecurityEmail]                   = useState(auth.currentUser?.email || "");
  const [securityPassword, setSecurityPassword]             = useState("");
  const [securityConfirmPassword, setSecurityConfirmPassword] = useState("");
  const [securitySuccess, setSecuritySuccess]               = useState("");
  const [securityError, setSecurityError]                   = useState("");
  const [emailLoading, setEmailLoading]                     = useState(false);
  const [passwordLoading, setPasswordLoading]               = useState(false);
  const [showNewPassword, setShowNewPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword]       = useState(false);

  const initialLoad = async () => {
    try {
      setLoading(true);
      const [rData, rtData] = await Promise.all([getRooms(), getRoomTypes()]);
      setRooms(rData); setRoomTypes(rtData);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Silent refresh — doesn't flash loading state
  const refreshData = async () => {
    try {
      const [rData, rtData] = await Promise.all([getRooms(), getRoomTypes()]);
      setRooms(rData); setRoomTypes(rtData);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { initialLoad(); }, []);

  // ── ADD ROOM TYPE ──
  const handleAddRoomType = async (e) => {
    e.preventDefault();
    setRtError(""); setRtSuccess("");
    if (!rtId || !rtName || !rtPrice) { setRtError("Please fill in all required fields."); return; }
    const cleanId = rtId.toLowerCase().trim().replace(/\s+/g, "-");
    setRtAdding(true);
    try {
      await addRoomType({ id: cleanId, name: rtName, price: Number(rtPrice), capacity: Number(rtCapacity), description: rtDescription }, user);
      setRtId(""); setRtName(""); setRtPrice(""); setRtCapacity(2); setRtDescription("");
      setRtSuccess("Room type added successfully!");
      setTimeout(() => setRtSuccess(""), 3000);
      refreshData();
    } catch (err) {
      setRtError(err.message || "Failed to create room type.");
    } finally { setRtAdding(false); }
  };

  // ── START EDIT ──
  const startEdit = (rt) => {
    setEditingId(rt.id);
    setEditFields({ name: rt.name, price: rt.price, capacity: rt.capacity, description: rt.description || "" });
    setEditError("");
  };

  // ── SAVE EDIT ──
  const handleSaveEdit = async (rtId) => {
    setEditError("");
    if (!editFields.name || !editFields.price) { setEditError("Name and price are required."); return; }
    setEditSaving(true);
    try {
      await updateRoomType(rtId, editFields, user);
      setEditingId(null);
      refreshData();
    } catch (err) {
      setEditError(err.message || "Failed to update room type.");
    } finally { setEditSaving(false); }
  };

  // ── DELETE ROOM TYPE ──
  const handleDeleteRoomType = async (rt) => {
    try {
      const q = query(collection(db, "bookings"), where("roomType", "==", rt.id));
      const snap = await getDocs(q);
      const activeCount = snap.docs.filter(d => {
        const s = d.data().bookingStatus;
        return s === "confirmed" || s === "checked-in" || s === "pending";
      }).length;

      let msg = `Delete room type "${rt.name}"?\nThis will also remove all rooms of this type.`;
      if (activeCount > 0) msg += `\n\n⚠️ ${activeCount} active booking(s) will be affected.`;
      if (!window.confirm(msg)) return;

      setDeletingId(rt.id);
      await deleteRoomType(rt.id, rt.name, user);
      refreshData();
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally { setDeletingId(null); }
  };

  // ── UPDATE EMAIL ──
  const handleUpdateEmail = async () => {
    setSecurityError(""); setSecuritySuccess("");
    if (!securityEmail) { setSecurityError("Email cannot be empty."); return; }
    setEmailLoading(true);
    try {
      const cu = auth.currentUser;
      if (!cu) throw new Error("No authenticated user found.");
      if (securityEmail !== cu.email) {
        await updateEmail(cu, securityEmail);
        await updateDoc(doc(db, "users", cu.uid), { email: securityEmail });
      }
      setSecuritySuccess("Email updated successfully!");
      setTimeout(() => setSecuritySuccess(""), 3000);
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        setSecurityError("Requires recent login. Please log out and back in.");
      } else { setSecurityError(err.message || "Failed to update email."); }
    } finally { setEmailLoading(false); }
  };

  // ── UPDATE PASSWORD ──
  const handleUpdatePassword = async () => {
    setSecurityError(""); setSecuritySuccess("");
    if (!securityPassword) { setSecurityError("Enter a new password."); return; }
    if (securityPassword.length < 6) { setSecurityError("Password must be at least 6 characters."); return; }
    if (securityPassword !== securityConfirmPassword) { setSecurityError("Passwords do not match."); return; }
    setPasswordLoading(true);
    try {
      const cu = auth.currentUser;
      if (!cu) throw new Error("No authenticated user found.");
      await updatePassword(cu, securityPassword);
      setSecuritySuccess("Password updated successfully!");
      setSecurityPassword(""); setSecurityConfirmPassword("");
      setTimeout(() => setSecuritySuccess(""), 3000);
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        setSecurityError("Requires recent login. Please log out and back in.");
      } else { setSecurityError(err.message || "Failed to update password."); }
    } finally { setPasswordLoading(false); }
  };

  const tabs = [
    { id: "types",    label: "Room Types", icon: <BedDouble size={16} /> },
    { id: "security", label: "Security",   icon: <Lock size={16} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Keyframe for spinner — injected once */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Settings</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          Manage room types and security credentials.
        </p>
      </div>

      {/* Pill Tab Navigation */}
      <div style={{ display: "flex", gap: "0.5rem", background: "var(--bg-secondary)", border: "1px solid var(--card-border)", borderRadius: "99px", padding: "0.35rem", width: "fit-content" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.5rem 1.25rem", borderRadius: "99px", border: "none", cursor: "pointer",
            fontSize: "0.875rem", fontWeight: 600, transition: "all 0.2s ease",
            background: activeTab === tab.id ? "var(--primary)" : "transparent",
            color: activeTab === tab.id ? "#fff" : "var(--text-secondary)",
            boxShadow: activeTab === tab.id ? "0 2px 8px rgba(59,130,246,0.3)" : "none"
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
          <Spinner size={20} /> Loading settings...
        </div>
      ) : (
        <>
          {/* ── TAB: ROOM TYPES ── */}
          {activeTab === "types" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

              {/* Add Form */}
              {user.role === "admin" && (
                <div className="card" style={{ padding: "1.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
                    <div style={{ background: "rgba(59,130,246,0.12)", color: "var(--primary)", borderRadius: "8px", padding: "6px", display: "flex" }}>
                      <Plus size={16} />
                    </div>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Add New Room Type</h2>
                  </div>

                  {rtError && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--danger-glow)", color: "var(--danger)", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                      <AlertCircle size={15} style={{ flexShrink: 0 }} /> {rtError}
                    </div>
                  )}
                  {rtSuccess && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--success-glow)", color: "var(--success)", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                      <CheckCircle2 size={15} style={{ flexShrink: 0 }} /> {rtSuccess}
                    </div>
                  )}

                  <form onSubmit={handleAddRoomType}>
                    <div className="grid-form-4col" style={{ marginBottom: "1rem" }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "5px" }}><Tag size={12} /> Type Code *</label>
                        <input type="text" className="input-control" placeholder="e.g. deluxe" value={rtId} onChange={e => setRtId(e.target.value)} required disabled={rtAdding} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "5px" }}><BedDouble size={12} /> Display Name *</label>
                        <input type="text" className="input-control" placeholder="e.g. Deluxe Double" value={rtName} onChange={e => setRtName(e.target.value)} required disabled={rtAdding} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "5px" }}><IndianRupee size={12} /> Price / Night *</label>
                        <input type="number" className="input-control" placeholder="120" value={rtPrice} onChange={e => setRtPrice(e.target.value)} required disabled={rtAdding} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "5px" }}><Users2 size={12} /> Capacity *</label>
                        <input type="number" className="input-control" min="1" value={rtCapacity} onChange={e => setRtCapacity(e.target.value)} required disabled={rtAdding} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                      <div className="form-group" style={{ margin: 0, flex: 1, minWidth: "220px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "5px" }}><FileText size={12} /> Description</label>
                        <input type="text" className="input-control" placeholder="Describe amenities, bed specs..." value={rtDescription} onChange={e => setRtDescription(e.target.value)} disabled={rtAdding} />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ padding: "0.6rem 1.5rem", whiteSpace: "nowrap", minWidth: 130, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }} disabled={rtAdding}>
                        {rtAdding ? <><Spinner size={15} /> Adding...</> : <><Plus size={14} /> Add Type</>}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Room Types Table */}
              <div className="card">
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div style={{ background: "rgba(59,130,246,0.12)", color: "var(--primary)", borderRadius: "8px", padding: "6px", display: "flex" }}>
                    <BedDouble size={16} />
                  </div>
                  <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Existing Room Types</h2>
                  <span style={{ marginLeft: "auto", background: "var(--bg-tertiary)", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 600, padding: "2px 10px", borderRadius: "99px" }}>
                    {roomTypes.length} types
                  </span>
                </div>

                {editError && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--danger-glow)", color: "var(--danger)", padding: "0.65rem 1.25rem", fontSize: "0.83rem" }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} /> {editError}
                  </div>
                )}

                <div className="table-wrapper">
                  {roomTypes.length === 0 ? (
                    <div className="no-data">No room types configured yet. Add one above.</div>
                  ) : (
                    <table className="table-custom">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Display Name</th>
                          <th>Capacity</th>
                          <th>Price / Night</th>
                          <th>Description</th>
                          {user.role === "admin" && <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {roomTypes.map(rt => {
                          const isEditing = editingId === rt.id;
                          const isDeleting = deletingId === rt.id;

                          return (
                            <tr key={rt.id} style={{ background: isEditing ? "rgba(59,130,246,0.04)" : undefined }}>
                              {/* Code */}
                              <td>
                                <code style={{ background: "var(--bg-tertiary)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{rt.id}</code>
                              </td>

                              {/* Name */}
                              <td>
                                {isEditing ? (
                                  <input
                                    className="input-control"
                                    style={{ margin: 0, padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
                                    value={editFields.name}
                                    onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))}
                                    disabled={editSaving}
                                  />
                                ) : (
                                  <strong style={{ color: "var(--text-primary)" }}>{rt.name}</strong>
                                )}
                              </td>

                              {/* Capacity */}
                              <td>
                                {isEditing ? (
                                  <input
                                    type="number" min="1"
                                    className="input-control"
                                    style={{ margin: 0, padding: "0.35rem 0.6rem", fontSize: "0.85rem", width: 70 }}
                                    value={editFields.capacity}
                                    onChange={e => setEditFields(f => ({ ...f, capacity: e.target.value }))}
                                    disabled={editSaving}
                                  />
                                ) : (
                                  `${rt.capacity} guests`
                                )}
                              </td>

                              {/* Price */}
                              <td>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    className="input-control"
                                    style={{ margin: 0, padding: "0.35rem 0.6rem", fontSize: "0.85rem", width: 90 }}
                                    value={editFields.price}
                                    onChange={e => setEditFields(f => ({ ...f, price: e.target.value }))}
                                    disabled={editSaving}
                                  />
                                ) : (
                                  <span style={{ fontWeight: 700, color: "var(--primary)" }}>₹{rt.price}</span>
                                )}
                              </td>

                              {/* Description */}
                              <td style={{ maxWidth: 200 }}>
                                {isEditing ? (
                                  <input
                                    className="input-control"
                                    style={{ margin: 0, padding: "0.35rem 0.6rem", fontSize: "0.82rem" }}
                                    placeholder="Description (optional)"
                                    value={editFields.description}
                                    onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))}
                                    disabled={editSaving}
                                  />
                                ) : (
                                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{rt.description || "—"}</span>
                                )}
                              </td>

                              {/* Actions */}
                              {user.role === "admin" && (
                                <td style={{ textAlign: "right" }}>
                                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                    {isEditing ? (
                                      <>
                                        {/* Save */}
                                        <button
                                          className="btn btn-primary"
                                          style={{ padding: "0.35rem 0.85rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "5px", minWidth: 75 }}
                                          onClick={() => handleSaveEdit(rt.id)}
                                          disabled={editSaving}
                                        >
                                          {editSaving ? <><Spinner size={13} /> Saving</> : <><Check size={13} /> Save</>}
                                        </button>
                                        {/* Cancel */}
                                        <button
                                          className="btn"
                                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "5px", background: "var(--bg-tertiary)", border: "1px solid var(--card-border)", color: "var(--text-secondary)" }}
                                          onClick={() => { setEditingId(null); setEditError(""); }}
                                          disabled={editSaving}
                                        >
                                          <X size={13} /> Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        {/* Edit */}
                                        <button
                                          className="btn"
                                          style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "5px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "var(--primary)" }}
                                          onClick={() => startEdit(rt)}
                                          disabled={isDeleting || editingId !== null}
                                          title="Edit room type"
                                        >
                                          <Pencil size={13} /> Edit
                                        </button>
                                        {/* Delete */}
                                        <button
                                          className="btn btn-danger btn-icon"
                                          style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 36 }}
                                          onClick={() => handleDeleteRoomType(rt)}
                                          disabled={isDeleting || editingId !== null}
                                          title="Delete room type"
                                        >
                                          {isDeleting ? <Spinner size={14} color="white" /> : <Trash2 size={14} style={{ color: "white" }} />}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="grid-form-2col" style={{ gap: "1.25rem" }}>

              {/* Email Card */}
              <div className="card" style={{ padding: "1.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
                  <div style={{ background: "rgba(59,130,246,0.12)", color: "var(--primary)", borderRadius: "8px", padding: "8px", display: "flex" }}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Email Address</h2>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "1px" }}>Update your login email</p>
                  </div>
                </div>

                {securityError && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", background: "var(--danger-glow)", color: "var(--danger)", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {securityError}
                  </div>
                )}
                {securitySuccess && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--success-glow)", color: "var(--success)", padding: "0.75rem 1rem", borderRadius: "var(--radius-sm)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
                    <CheckCircle2 size={15} style={{ flexShrink: 0 }} /> {securitySuccess}
                  </div>
                )}

                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" className="input-control" value={securityEmail} onChange={e => setSecurityEmail(e.target.value)} placeholder="admin@hotel.com" disabled={emailLoading} />
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                  onClick={handleUpdateEmail}
                  disabled={emailLoading || securityEmail === auth.currentUser?.email}
                >
                  {emailLoading ? <><Spinner size={15} /> Updating...</> : "Update Email"}
                </button>
              </div>

              {/* Password Card */}
              <div className="card" style={{ padding: "1.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
                  <div style={{ background: "rgba(168,85,247,0.12)", color: "#a855f7", borderRadius: "8px", padding: "8px", display: "flex" }}>
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Change Password</h2>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "1px" }}>Minimum 6 characters required</p>
                  </div>
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showNewPassword ? "text" : "password"} className="input-control" placeholder="Enter new password" value={securityPassword} onChange={e => setSecurityPassword(e.target.value)} style={{ paddingRight: "2.5rem" }} disabled={passwordLoading} />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", padding: "4px" }}>
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <div style={{ position: "relative" }}>
                    <input type={showConfirmPassword ? "text" : "password"} className="input-control" placeholder="Confirm new password" value={securityConfirmPassword} onChange={e => setSecurityConfirmPassword(e.target.value)} style={{ paddingRight: "2.5rem" }} disabled={passwordLoading} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center", padding: "4px" }}>
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  style={{ width: "100%", background: "#a855f7", borderColor: "#a855f7", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                  onClick={handleUpdatePassword}
                  disabled={passwordLoading || !securityPassword}
                >
                  {passwordLoading ? <><Spinner size={15} /> Updating...</> : "Change Password"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Settings;
