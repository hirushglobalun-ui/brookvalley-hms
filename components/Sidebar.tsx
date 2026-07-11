"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../lib/auth";
import { 
  LayoutDashboard, 
  BookOpen, 
  Calendar, 
  Users, 
  Settings, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

/**
 * Properties expected by the Sidebar layout component.
 */
interface SidebarProps {
  /** Indicates if the desktop sidebar menu is folded. */
  isCollapsed: boolean;
  /** Triggered to toggle the desktop sidebar fold state. */
  onToggle: () => void;
}

/**
 * Representation of an individual menu link option.
 */
interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: string[];
}

/**
 * Main sidebar navigation panel displaying menus and user identity statuses.
 * Incorporates mobile overlays and a deferred PWA installation button.
 * 
 * @param props - SidebarProps interface fields.
 * @returns React Component or null if not authenticated.
 */
const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (!user) return null;

  const menuItems: MenuItem[] = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["admin", "employee"] },
    { name: "Bookings", path: "/bookings", icon: BookOpen, roles: ["admin", "employee"] },
    { name: "Calendar", path: "/calendar", icon: Calendar, roles: ["admin", "employee"] },
    { name: "Employees", path: "/employees", icon: Users, roles: ["admin"] },
    { name: "Reports", path: "/reports", icon: BarChart3, roles: ["admin"] },
    { name: "Settings", path: "/settings", icon: Settings, roles: ["admin", "employee"] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));
  
  const initials = user.fullName
    ? user.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
    : "U";

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
      >
        <Menu size={22} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside 
        className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}
        role="navigation"
        aria-label="Main Sidebar Navigation"
      >
        <div className="sidebar-logo" style={{ gap: "0.5rem", position: "relative" }}>
          <img 
            src="/image-Photoroom (27).png" 
            alt="Brookvalley Logo" 
            style={{ width: "32px", height: "32px", objectFit: "contain", flexShrink: 0 }} 
          />
          <span className="logo-text">Brookvalley HMS</span>
          
          {/* Desktop collapse button */}
          <button
            onClick={onToggle}
            className="sidebar-collapse-toggle-btn"
            aria-label="Toggle sidebar fold state"
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px",
              borderRadius: "4px",
              transition: "all 0.2s"
            }}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* Mobile close button */}
          <button
            className="mobile-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav style={{ flex: 1 }}>
          <ul className="sidebar-menu">
            {filteredMenu.map(item => {
              const isActive = pathname === item.path;
              return (
                <li key={item.name} className="sidebar-item">
                  <Link 
                    href={item.path} 
                    className={isActive ? "active" : ""}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon size={18} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-profile" aria-label="Active logged-in user info">
            <div className="user-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="user-info">
              <span className="user-name" title={user.fullName}>{user.fullName}</span>
              <span className="user-role">{user.role}</span>
            </div>
          </div>
          
          {deferredPrompt && !isCollapsed && (
            <button 
              onClick={handleInstallClick} 
              className="btn" 
              style={{ 
                width: "100%", 
                padding: "0.6rem", 
                justifyContent: "center",
                fontSize: "0.85rem",
                marginTop: "0.75rem",
                background: "var(--primary-glow)",
                border: "1px solid var(--primary)",
                color: "var(--primary)"
              }}
            >
              <span>Install App</span>
            </button>
          )}
          
          <button 
            onClick={handleLogout} 
            className="btn btn-secondary" 
            style={{ 
              width: "100%", 
              padding: "0.6rem", 
              justifyContent: "center",
              fontSize: "0.85rem",
              marginTop: "0.5rem"
            }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
