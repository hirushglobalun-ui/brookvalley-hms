"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../lib/auth";
import {
  SettingsService,
  RoomTypesTab,
  RoomsTab,
  SecurityTab,
  ResetTab,
  SafetyTab
} from "../../../features/settings";
import {
  BedDouble,
  Lock,
  KeyRound,
  AlertOctagon,
  Shield
} from "lucide-react";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { Room, RoomType } from "../../../types";

const settingsService = new SettingsService();

// Tiny spinner component
const Spinner = ({ size = 15, color = "currentColor" }: { size?: number; color?: string }) => (
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

const SettingsContent = () => {
  const { user } = useAuth();

  const [rooms, setRooms]         = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("types");

  const initialLoad = async () => {
    try {
      setLoading(true);
      const [rData, rtData] = await Promise.all([
        settingsService.getRooms(),
        settingsService.getRoomTypes()
      ]);
      setRooms(rData);
      setRoomTypes(rtData);
    } catch (err) { 
      console.error("Settings load error:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  const refreshData = async () => {
    try {
      const [rData, rtData] = await Promise.all([
        settingsService.getRooms(),
        settingsService.getRoomTypes()
      ]);
      setRooms(rData);
      setRoomTypes(rtData);
    } catch (err) { 
      console.error(err); 
    }
  };

  useEffect(() => { 
    initialLoad(); 
  }, []);

  const handleAddRoomType = async (payload: any) => {
    await settingsService.addRoomType(payload, user);
    refreshData();
  };

  const handleUpdateRoomType = async (id: string, payload: any) => {
    await settingsService.updateRoomType(id, payload, user);
    refreshData();
  };

  const handleDeleteRoomType = async (rt: RoomType) => {
    await settingsService.deleteRoomType(rt.id, rt.name, user);
    refreshData();
  };

  const handleAddRoom = async (payload: any) => {
    await settingsService.addRoom(payload, user);
    refreshData();
  };

  const handleUpdateRoom = async (oldRoomNumber: string, payload: any) => {
    await settingsService.updateRoom(oldRoomNumber, payload, user);
    refreshData();
  };

  const handleDeleteRoom = async (roomNumber: string) => {
    await settingsService.deleteRoom(roomNumber, user);
    refreshData();
  };

  const handleClearBookings = async () => {
    // Note: clearAllBookings remains on the compatibility layer or bookings service, let's keep it here
    const { clearAllBookings } = await import("../../../lib/db");
    await clearAllBookings(user);
    refreshData();
  };

  const handleClearEmployees = async () => {
    const { clearAllEmployees } = await import("../../../lib/db");
    await clearAllEmployees(user);
    refreshData();
  };

  const handleClearRoomTypes = async () => {
    await settingsService.clearAllRoomTypes(user);
    refreshData();
  };

  const tabs = [
    ...(user?.role === "admin" ? [
      { id: "types",    label: "Room Types", icon: <BedDouble size={16} /> },
      { id: "rooms",    label: "Room Numbers", icon: <KeyRound size={16} /> }
    ] : []),
    { id: "security", label: "Security",   icon: <Lock size={16} /> }
  ];

  if (!user) return null;

  const safeActiveTab = tabs.find(t => t.id === activeTab) ? activeTab : tabs[0].id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: "1.7rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Settings</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          Manage room types and security credentials.
        </p>
      </div>

      {/* Pill Tab Navigation */}
      <div className="pill-tabs-container">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.5rem 1.25rem", borderRadius: "99px", border: "none", cursor: "pointer",
            fontSize: "0.875rem", fontWeight: 600, transition: "all 0.2s ease",
            background: safeActiveTab === tab.id ? "var(--primary)" : "transparent",
            color: safeActiveTab === tab.id ? "#fff" : "var(--text-secondary)",
            boxShadow: safeActiveTab === tab.id ? "0 2px 8px rgba(59,130,246,0.3)" : "none"
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
          {/* Room Types tab */}
          {safeActiveTab === "types" && (
            <RoomTypesTab
              roomTypes={roomTypes}
              user={user}
              onAddRoomType={handleAddRoomType}
              onUpdateRoomType={handleUpdateRoomType}
              onDeleteRoomType={handleDeleteRoomType}
            />
          )}

          {/* Room Numbers tab */}
          {safeActiveTab === "rooms" && (
            <RoomsTab
              rooms={rooms}
              roomTypes={roomTypes}
              user={user}
              onAddRoom={handleAddRoom}
              onUpdateRoom={handleUpdateRoom}
              onDeleteRoom={handleDeleteRoom}
            />
          )}

          {/* Security Tab */}
          {safeActiveTab === "security" && (
            <SecurityTab user={user} />
          )}
        </>
      )}
    </div>
  );
};

export default function SettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "employee"]}>
      <SettingsContent />
    </ProtectedRoute>
  );
}
