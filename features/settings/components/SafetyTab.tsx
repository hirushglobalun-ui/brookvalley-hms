"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Shield, RefreshCw, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import {
  getDeletedBookingsAction,
  restoreBookingAction,
  purgeBookingAction
} from "../../../features/bookings/actions/bookingsActions";
import {
  getDeletedRoomsAction,
  restoreRoomAction,
  purgeRoomAction,
  getDeletedRoomTypesAction,
  restoreRoomTypeAction,
  purgeRoomTypeAction
} from "../actions/settingsActions";

interface SafetyTabProps {
  user: any;
}

const SafetyTab: React.FC<SafetyTabProps> = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState<"bookings" | "rooms" | "types">("bookings");
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async () => {
    if (user?.role !== "admin") return;
    try {
      setLoading(true);
      setMessage(null);
      const [bData, rData, rtData] = await Promise.all([
        getDeletedBookingsAction(user),
        getDeletedRoomsAction(user),
        getDeletedRoomTypesAction(user)
      ]);
      setBookings(bData);
      setRooms(rData);
      setRoomTypes(rtData);
    } catch (err: any) {
      setMessage({ type: "error", text: "Failed to fetch deleted records: " + err.message });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (user?.role !== "admin") {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--danger)" }}>
        <AlertTriangle style={{ margin: "0 auto 1rem" }} size={32} />
        <p style={{ fontWeight: 600 }}>Access Denied: Only administrators are authorized to access operational safety settings.</p>
      </div>
    );
  }

  const handleRestoreBooking = async (bId: string) => {
    setActionLoading(`restore-booking-${bId}`);
    setMessage(null);
    try {
      await restoreBookingAction(bId, user);
      setMessage({ type: "success", text: `Booking ${bId} has been successfully restored!` });
      await loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePurgeBooking = async (bId: string) => {
    if (!window.confirm("ARE YOU SURE? This booking record will be PERMANENTLY PURGED. This action is irreversible.")) return;
    setActionLoading(`purge-booking-${bId}`);
    setMessage(null);
    try {
      await purgeBookingAction(bId, user);
      setMessage({ type: "success", text: `Booking ${bId} has been permanently purged.` });
      await loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: "Purge failed: " + err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreRoom = async (roomNumber: string) => {
    setActionLoading(`restore-room-${roomNumber}`);
    setMessage(null);
    try {
      await restoreRoomAction(roomNumber, user);
      setMessage({ type: "success", text: `Room ${roomNumber} has been restored successfully.` });
      await loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePurgeRoom = async (roomNumber: string) => {
    if (!window.confirm(`Permanently purge Room ${roomNumber}? This cannot be undone.`)) return;
    setActionLoading(`purge-room-${roomNumber}`);
    setMessage(null);
    try {
      await purgeRoomAction(roomNumber, user);
      setMessage({ type: "success", text: `Room ${roomNumber} has been permanently purged.` });
      await loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: "Purge failed: " + err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreRoomType = async (id: string) => {
    setActionLoading(`restore-type-${id}`);
    setMessage(null);
    try {
      await restoreRoomTypeAction(id, user);
      setMessage({ type: "success", text: `Room Type ${id} restored successfully.` });
      await loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePurgeRoomType = async (id: string) => {
    if (!window.confirm(`Permanently purge Room Type ${id}? This cannot be undone.`)) return;
    setActionLoading(`purge-type-${id}`);
    setMessage(null);
    try {
      await purgeRoomTypeAction(id, user);
      setMessage({ type: "success", text: `Room Type ${id} has been permanently purged.` });
      await loadData();
    } catch (err: any) {
      setMessage({ type: "error", text: "Purge failed: " + err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (isoStr: string | null | undefined) => {
    if (!isoStr) return "N/A";
    return new Date(isoStr).toLocaleString();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Alert Messaging */}
      {message && (
        <div 
          className="card" 
          style={{ 
            padding: "1rem", 
            backgroundColor: message.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
            border: message.type === "success" ? "1px solid var(--success)" : "1px solid var(--danger)",
            color: message.type === "success" ? "var(--success)" : "var(--danger)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 550
          }}
        >
          {message.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Safety Header Panel */}
      <div className="card" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Shield size={24} style={{ color: "var(--primary)" }} />
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Operational Safety & Recovery</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Inspect soft-deleted records, check restoration conflicts, or permanently purge obsolete mappings.
          </p>
        </div>
        <button 
          onClick={loadData} 
          disabled={loading} 
          className="btn btn-secondary" 
          style={{ marginLeft: "auto", padding: "0.5rem" }}
          aria-label="Refresh deleted records"
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} />
        </button>
      </div>

      {/* Sub-tab Navigation */}
      <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "0.5rem" }}>
        <button 
          onClick={() => setActiveSubTab("bookings")}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "0.5rem 0",
            fontSize: "0.875rem", fontWeight: 600,
            color: activeSubTab === "bookings" ? "var(--primary)" : "var(--text-secondary)",
            borderBottom: activeSubTab === "bookings" ? "2px solid var(--primary)" : "2px solid transparent"
          }}
        >
          Deleted Bookings ({bookings.length})
        </button>
        <button 
          onClick={() => setActiveSubTab("rooms")}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "0.5rem 0",
            fontSize: "0.875rem", fontWeight: 600,
            color: activeSubTab === "rooms" ? "var(--primary)" : "var(--text-secondary)",
            borderBottom: activeSubTab === "rooms" ? "2px solid var(--primary)" : "2px solid transparent"
          }}
        >
          Deleted Rooms ({rooms.length})
        </button>
        <button 
          onClick={() => setActiveSubTab("types")}
          style={{
            background: "none", border: "none", cursor: "pointer", padding: "0.5rem 0",
            fontSize: "0.875rem", fontWeight: 600,
            color: activeSubTab === "types" ? "var(--primary)" : "var(--text-secondary)",
            borderBottom: activeSubTab === "types" ? "2px solid var(--primary)" : "2px solid transparent"
          }}
        >
          Deleted Room Types ({roomTypes.length})
        </button>
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Querying trash database...
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          {activeSubTab === "bookings" && (
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--card-border)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}>Booking ID</th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}>Guest</th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}>Room(s)</th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}>Dates</th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}>Deleted At</th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}>Reason</th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      No deleted booking records found.
                    </td>
                  </tr>
                ) : (
                  bookings.map(b => (
                    <tr key={b.bookingId} style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", fontWeight: 600 }}>{b.bookingId}</td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem" }}>
                        <div style={{ fontWeight: 550 }}>{b.customerName}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{b.customerPhone}</div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem" }}>
                        <span className="badge badge-warning">{b.roomNumber}</span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem" }}>
                        <div style={{ fontSize: "0.8rem" }}>{b.checkInDate} to {b.checkOutDate}</div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{formatDate(b.deletedAt)}</td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>{b.deleteReason || "Unspecified"}</td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                            onClick={() => handleRestoreBooking(b.bookingId)}
                            disabled={actionLoading !== null}
                          >
                            Restore
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: "0.35rem 0.5rem", fontSize: "0.75rem" }}
                            onClick={() => handlePurgeBooking(b.bookingId)}
                            disabled={actionLoading !== null}
                            aria-label="Permanently purge booking"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeSubTab === "rooms" && (
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--card-border)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}>Room Number</th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}>Room Type</th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}>Last Status</th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      No retired room numbers found.
                    </td>
                  </tr>
                ) : (
                  rooms.map(r => (
                    <tr key={r.roomNumber} style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", fontWeight: 600 }}>{r.roomNumber}</td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem" }}>{r.roomType}</td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem" }}>
                        <span className="badge badge-secondary">{r.status}</span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                            onClick={() => handleRestoreRoom(r.roomNumber)}
                            disabled={actionLoading !== null}
                          >
                            Restore
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: "0.35rem 0.5rem", fontSize: "0.75rem" }}
                            onClick={() => handlePurgeRoom(r.roomNumber)}
                            disabled={actionLoading !== null}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeSubTab === "types" && (
            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--card-border)", color: "var(--text-secondary)" }}>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}>Type ID</th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}>Type Name</th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}>Price</th>
                  <th style={{ padding: "0.75rem 1rem", fontSize: "0.8rem", fontWeight: 600, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roomTypes.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      No retired room types found.
                    </td>
                  </tr>
                ) : (
                  roomTypes.map(t => (
                    <tr key={t.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", fontWeight: 600 }}>{t.id}</td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem" }}>{t.name}</td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem" }}>${t.price}/night</td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                            onClick={() => handleRestoreRoomType(t.id)}
                            disabled={actionLoading !== null}
                          >
                            Restore
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: "0.35rem 0.5rem", fontSize: "0.75rem" }}
                            onClick={() => handlePurgeRoomType(t.id)}
                            disabled={actionLoading !== null}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default SafetyTab;
