"use client";

import React, { useState } from "react";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";
import { RoomType } from "../../../types";

interface RoomTypesTabProps {
  roomTypes: RoomType[];
  user: any;
  onAddRoomType: (payload: any) => Promise<void>;
  onUpdateRoomType: (id: string, payload: any) => Promise<void>;
  onDeleteRoomType: (rt: RoomType) => Promise<void>;
}

const RoomTypesTab: React.FC<RoomTypesTabProps> = ({
  roomTypes,
  user: _user,
  onAddRoomType,
  onUpdateRoomType,
  onDeleteRoomType
}) => {
  // Add Form states
  const [rtId, setRtId] = useState("");
  const [rtName, setRtName] = useState("");
  const [rtPrice, setRtPrice] = useState("");
  const [rtCapacity, setRtCapacity] = useState<number | "">(2);
  const [rtDescription, setRtDescription] = useState("");
  
  const [rtError, setRtError] = useState("");
  const [rtSuccess, setRtSuccess] = useState("");
  const [rtAdding, setRtAdding] = useState(false);

  // Edit Table states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<RoomType>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRtError("");
    setRtSuccess("");
    if (!rtId || !rtName || !rtPrice) {
      setRtError("Please fill in all required fields.");
      return;
    }

    const cleanId = rtId.toLowerCase().trim().replace(/\s+/g, "-");
    setRtAdding(true);
    try {
      await onAddRoomType({
        id: cleanId,
        name: rtName,
        price: Number(rtPrice),
        capacity: Number(rtCapacity),
        description: rtDescription
      });
      setRtId("");
      setRtName("");
      setRtPrice("");
      setRtCapacity(2);
      setRtDescription("");
      setRtSuccess("Room type added successfully!");
      setTimeout(() => setRtSuccess(""), 3000);
    } catch (err: any) {
      setRtError(err.message || "Failed to create room type.");
    } finally {
      setRtAdding(false);
    }
  };

  const startEdit = (rt: RoomType) => {
    setEditingId(rt.id);
    setEditFields({
      name: rt.name,
      price: rt.price,
      capacity: rt.capacity,
      description: rt.description || ""
    });
  };

  const saveEdit = async (id: string) => {
    if (!editFields.name || editFields.price === undefined || (editFields.price as any) === "") {
      alert("Name and price are required.");
      return;
    }
    if (editFields.capacity === undefined || (editFields.capacity as any) === "" || Number(editFields.capacity) <= 0) {
      alert("Capacity must be at least 1.");
      return;
    }
    setEditSaving(true);
    try {
      await onUpdateRoomType(id, editFields);
      setEditingId(null);
    } catch (err: any) {
      alert("Failed to update room type: " + (err.message || "Unknown error"));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (rt: RoomType) => {
    setDeletingId(rt.id);
    try {
      await onDeleteRoomType(rt);
    } catch (err: any) {
      alert("Failed to delete room type: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Add New Room Type form */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Add New Room Type</h3>
        
        <form onSubmit={handleAddSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {rtError && <div className="badge badge-danger" style={{ padding: "0.5rem 0.75rem", borderRadius: "4px" }}>{rtError}</div>}
          {rtSuccess && <div className="badge badge-success" style={{ padding: "0.5rem 0.75rem", borderRadius: "4px" }}>{rtSuccess}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }} className="mobile-stacked-grid">
            <div className="form-group">
              <label>Room Type ID * (Slug, e.g. deluxe-double)</label>
              <input type="text" className="input-control" value={rtId} onChange={e => setRtId(e.target.value)} placeholder="e.g. standard-hut" required />
            </div>
            <div className="form-group">
              <label>Display Name *</label>
              <input type="text" className="input-control" value={rtName} onChange={e => setRtName(e.target.value)} placeholder="e.g. Standard Hut" required />
            </div>
            <div className="form-group">
              <label>Base Price per Night (₹) *</label>
              <input type="number" className="input-control" value={rtPrice} onChange={e => setRtPrice(e.target.value)} placeholder="e.g. 1500" required />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "1rem" }} className="mobile-stacked-grid">
            <div className="form-group">
              <label>Standard Capacity *</label>
              <input type="number" className="input-control" min="1" value={rtCapacity} onChange={e => setRtCapacity(e.target.value === "" ? "" : Number(e.target.value))} required />
            </div>
            <div className="form-group">
              <label>Short Description</label>
              <input type="text" className="input-control" value={rtDescription} onChange={e => setRtDescription(e.target.value)} placeholder="e.g. Traditional mud hut with garden view..." />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "fit-content" }} disabled={rtAdding}>
            <Plus size={16} />
            <span>{rtAdding ? "Adding..." : "Add Room Type"}</span>
          </button>
        </form>
      </div>

      {/* Configured Room Types list */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--card-border)" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Configured Room Types</h3>
        </div>

        <div className="table-wrapper">
          <table className="table-custom">
            <thead>
              <tr>
                <th style={{ width: "15%" }}>Type ID</th>
                <th style={{ width: "20%" }}>Display Name</th>
                <th style={{ width: "15%" }}>Price / Night</th>
                <th style={{ width: "12%" }}>Capacity</th>
                <th style={{ width: "28%" }}>Description</th>
                <th style={{ width: "10%", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roomTypes.map(rt => {
                const isEditing = editingId === rt.id;
                return (
                  <tr key={rt.id}>
                    <td style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 700 }}>{rt.id}</td>
                    
                    <td>
                      {isEditing ? (
                        <input type="text" className="input-control" style={{ padding: "0.3rem", fontSize: "0.85rem" }} value={editFields.name || ""} onChange={e => setEditFields({ ...editFields, name: e.target.value })} />
                      ) : rt.name}
                    </td>

                    <td>
                      {isEditing ? (
                        <input type="number" className="input-control" style={{ padding: "0.3rem", fontSize: "0.85rem" }} value={editFields.price !== undefined && editFields.price !== null ? editFields.price : ""} onChange={e => setEditFields({ ...editFields, price: e.target.value === "" ? "" as any : Number(e.target.value) })} />
                      ) : `₹${rt.price}`}
                    </td>

                    <td>
                      {isEditing ? (
                        <input type="number" className="input-control" style={{ padding: "0.3rem", fontSize: "0.85rem" }} value={editFields.capacity !== undefined && editFields.capacity !== null ? editFields.capacity : ""} onChange={e => setEditFields({ ...editFields, capacity: e.target.value === "" ? "" as any : Number(e.target.value) })} />
                      ) : `${rt.capacity} Guests`}
                    </td>

                    <td>
                      {isEditing ? (
                        <input type="text" className="input-control" style={{ padding: "0.3rem", fontSize: "0.85rem" }} value={editFields.description || ""} onChange={e => setEditFields({ ...editFields, description: e.target.value })} />
                      ) : rt.description || "—"}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                        {isEditing ? (
                          <>
                            <button className="btn btn-primary btn-icon" style={{ padding: "0.3rem" }} onClick={() => saveEdit(rt.id)} disabled={editSaving} title="Save edits">
                              <Check size={14} />
                            </button>
                            <button className="btn btn-secondary btn-icon" style={{ padding: "0.3rem" }} onClick={() => setEditingId(null)} title="Cancel edits">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-secondary btn-icon" style={{ padding: "0.3rem" }} onClick={() => startEdit(rt)} title="Edit room type">
                              <Pencil size={14} />
                            </button>
                            <button className="btn btn-danger btn-icon" style={{ padding: "0.3rem" }} onClick={() => handleDelete(rt)} disabled={deletingId === rt.id} title="Delete room type">
                              <Trash2 size={14} style={{ color: "white" }} />
                            </button>
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

export default RoomTypesTab;
