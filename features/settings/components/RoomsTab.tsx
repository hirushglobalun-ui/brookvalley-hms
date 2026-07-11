"use client";

import React, { useState } from "react";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";
import { Room, RoomType } from "../../../types";

interface RoomsTabProps {
  rooms: Room[];
  roomTypes: RoomType[];
  user: any;
  onAddRoom: (payload: any) => Promise<void>;
  onUpdateRoom: (oldRoomNumber: string, payload: any) => Promise<void>;
  onDeleteRoom: (roomNumber: string) => Promise<void>;
}

const RoomsTab: React.FC<RoomsTabProps> = ({
  rooms,
  roomTypes,
  user,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom
}) => {
  // Add Form states
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newRoomType, setNewRoomType] = useState("");
  const [roomError, setRoomError] = useState("");
  const [roomSuccess, setRoomSuccess] = useState("");
  const [roomAdding, setRoomAdding] = useState(false);

  // Edit states
  const [editingRoomNumber, setEditingRoomNumber] = useState<string | null>(null);
  const [editRoomFields, setEditRoomFields] = useState<Partial<Room>>({});
  const [editRoomSaving, setEditRoomSaving] = useState(false);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomError("");
    setRoomSuccess("");
    if (!newRoomNumber || !newRoomType) {
      setRoomError("Please enter a room number and select a room type.");
      return;
    }
    setRoomAdding(true);
    try {
      await onAddRoom({
        roomNumber: newRoomNumber.trim(),
        roomType: newRoomType,
        status: "available"
      });
      setNewRoomNumber("");
      setRoomSuccess("Room added successfully!");
      setTimeout(() => setRoomSuccess(""), 3000);
    } catch (err: any) {
      setRoomError(err.message || "Failed to add room.");
    } finally {
      setRoomAdding(false);
    }
  };

  const startEditRoom = (r: Room) => {
    setEditingRoomNumber(r.roomNumber);
    setEditRoomFields({ roomNumber: r.roomNumber, roomType: r.roomType, status: r.status });
  };

  const saveEditRoom = async (oldRoomNumber: string) => {
    if (!editRoomFields.roomNumber || !editRoomFields.roomType || !editRoomFields.status) {
      alert("Room number, type, and status are required.");
      return;
    }
    setEditRoomSaving(true);
    try {
      await onUpdateRoom(oldRoomNumber, editRoomFields);
      setEditingRoomNumber(null);
    } catch (err: any) {
      alert("Failed to update room: " + (err.message || "Unknown error"));
    } finally {
      setEditRoomSaving(false);
    }
  };

  const handleDelete = async (roomNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete Room ${roomNumber}?`)) return;
    try {
      await onDeleteRoom(roomNumber);
    } catch (err: any) {
      alert("Failed to delete room: " + err.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Add New Room Number Form */}
      {user.role === "admin" && (
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Configure New Room Number</h3>
          
          <form onSubmit={handleAddSubmit} style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }} className="mobile-stacked-grid">
            {roomError && <div className="badge badge-danger" style={{ padding: "0.5rem 0.75rem", borderRadius: "4px", width: "100%" }}>{roomError}</div>}
            {roomSuccess && <div className="badge badge-success" style={{ padding: "0.5rem 0.75rem", borderRadius: "4px", width: "100%" }}>{roomSuccess}</div>}

            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label>Room Number *</label>
              <input type="text" className="input-control" value={newRoomNumber} onChange={e => setNewRoomNumber(e.target.value)} placeholder="e.g. 104" required />
            </div>

            <div className="form-group" style={{ flex: 1.5, margin: 0 }}>
              <label>Room Type Specifications *</label>
              <select className="input-control" value={newRoomType} onChange={e => setNewRoomType(e.target.value)} required>
                <option value="">Select Room Type</option>
                {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ height: "38px", display: "flex", alignItems: "center", gap: "0.5rem" }} disabled={roomAdding}>
              <Plus size={16} />
              <span>Add Room</span>
            </button>
          </form>
        </div>
      )}

      {/* Configured Room Numbers list */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--card-border)" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Configured Room Numbers</h3>
        </div>

        <div className="table-wrapper">
          <table className="table-custom">
            <thead>
              <tr>
                <th style={{ width: "25%" }}>Room Number</th>
                <th style={{ width: "35%" }}>Room Type Specifications</th>
                <th style={{ width: "25%" }}>Status</th>
                <th style={{ width: "15%", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map(room => {
                const isEditing = editingRoomNumber === room.roomNumber;
                const roomTypeLabel = roomTypes.find(rt => rt.id === room.roomType)?.name || room.roomType;
                
                return (
                  <tr key={room.roomNumber}>
                    <td style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                      {isEditing ? (
                        <input type="text" className="input-control" style={{ padding: "0.3rem", fontSize: "0.85rem", margin: 0 }} value={editRoomFields.roomNumber || ""} onChange={e => setEditRoomFields({ ...editRoomFields, roomNumber: e.target.value })} />
                      ) : `Room ${room.roomNumber}`}
                    </td>
                    
                    <td>
                      {isEditing ? (
                        <select className="input-control" style={{ padding: "0.3rem", fontSize: "0.85rem", margin: 0 }} value={editRoomFields.roomType || ""} onChange={e => setEditRoomFields({ ...editRoomFields, roomType: e.target.value })}>
                          {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
                        </select>
                      ) : roomTypeLabel}
                    </td>

                    <td>
                      {isEditing ? (
                        <select className={`input-control`} style={{ padding: "0.3rem", fontSize: "0.85rem", margin: 0 }} value={editRoomFields.status || ""} onChange={e => setEditRoomFields({ ...editRoomFields, status: e.target.value as Room["status"] })}>
                          <option value="available">AVAILABLE</option>
                          <option value="maintenance">MAINTENANCE</option>
                          {room.status === "occupied" && <option value="occupied" disabled>OCCUPIED (Auto)</option>}
                          {room.status === "reserved" && <option value="reserved" disabled>RESERVED (Auto)</option>}
                          {room.status === "dirty" && <option value="dirty" disabled>DIRTY (Auto)</option>}
                        </select>
                      ) : (
                        (() => {
                          switch (room.status) {
                            case "available":
                              return <span className="badge badge-success" style={{ textTransform: "uppercase", fontSize: "0.7rem", padding: "2px 8px" }}>available</span>;
                            case "occupied":
                              return <span className="badge badge-warning" style={{ textTransform: "uppercase", fontSize: "0.7rem", padding: "2px 8px" }}>occupied</span>;
                            case "maintenance":
                              return <span className="badge badge-danger" style={{ textTransform: "uppercase", fontSize: "0.7rem", padding: "2px 8px" }}>maintenance</span>;
                            case "reserved":
                              return <span className="badge badge-info" style={{ textTransform: "uppercase", fontSize: "0.7rem", padding: "2px 8px" }}>reserved</span>;
                            case "dirty":
                              return (
                                <span 
                                  className="badge" 
                                  style={{ 
                                    textTransform: "uppercase", 
                                    fontSize: "0.7rem", 
                                    padding: "2px 8px", 
                                    backgroundColor: "rgba(156, 163, 175, 0.15)", 
                                    color: "var(--text-muted)",
                                    border: "1px solid rgba(156, 163, 175, 0.3)"
                                  }}
                                >
                                  dirty
                                </span>
                              );
                            default:
                              return <span className="badge" style={{ textTransform: "uppercase", fontSize: "0.7rem", padding: "2px 8px" }}>{room.status}</span>;
                          }
                        })()
                      )}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                        {isEditing ? (
                          <>
                            <button className="btn btn-primary btn-icon" style={{ padding: "0.3rem" }} onClick={() => saveEditRoom(room.roomNumber)} disabled={editRoomSaving} title="Save edits">
                              <Check size={14} />
                            </button>
                            <button className="btn btn-secondary btn-icon" style={{ padding: "0.3rem" }} onClick={() => setEditingRoomNumber(null)} title="Cancel edits">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-secondary btn-icon" style={{ padding: "0.3rem" }} onClick={() => startEditRoom(room)} title="Edit room details">
                              <Pencil size={14} />
                            </button>
                            {user.role === "admin" && (
                              <button className="btn btn-danger btn-icon" style={{ padding: "0.3rem" }} onClick={() => handleDelete(room.roomNumber)} title="Delete room">
                                <Trash2 size={14} style={{ color: "white" }} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RoomsTab;
