"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "../../components/ProtectedRoute";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSidebarCollapsed(localStorage.getItem("sidebar_collapsed") === "true");
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const newVal = !prev;
      localStorage.setItem("sidebar_collapsed", String(newVal));
      return newVal;
    });
  };

  return (
    <ProtectedRoute>
      <div className={`app-container ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
        <div className="main-layout-container">
          <Header />
          <main className="main-content">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
