import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import CalendarView from "./pages/CalendarView";
import Employees from "./pages/Employees";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";

import Header from "./components/Header";

// General Layout Wrapper
const DashboardLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const newVal = !prev;
      localStorage.setItem("sidebar_collapsed", String(newVal));
      return newVal;
    });
  };

  return (
    <div className={`app-container ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <div className="main-layout-container">
        <Header />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Administrative & Employee Routing */}
          <Route element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Dashboard />} />
            
            <Route path="/bookings" element={<Bookings />} />
            
            <Route path="/calendar" element={<CalendarView />} />
            
            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Reports />
              </ProtectedRoute>
            } />

            {/* Admin-Only Restricted Pages */}
            <Route path="/employees" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Employees />
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Wildcard Fallback redirection */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
