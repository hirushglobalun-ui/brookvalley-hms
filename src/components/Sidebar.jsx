import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
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

const Sidebar = ({ isCollapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
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
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (!user) return null;

  const menuItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["admin", "employee"] },
    { name: "Bookings", path: "/bookings", icon: BookOpen, roles: ["admin", "employee"] },
    { name: "Calendar", path: "/calendar", icon: Calendar, roles: ["admin", "employee"] },
    { name: "Employees", path: "/employees", icon: Users, roles: ["admin"] },
    { name: "Settings", path: "/settings", icon: Settings, roles: ["admin", "employee"] },
    { name: "Reports", path: "/reports", icon: BarChart3, roles: ["admin"] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));
  
  const initials = user.fullName
    ? user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
    : "U";

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
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
            aria-label="Toggle sidebar"
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
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav style={{ flex: 1 }}>
          <ul className="sidebar-menu">
            {filteredMenu.map(item => (
              <li key={item.name} className="sidebar-item">
                <NavLink 
                  to={item.path} 
                  className={({ isActive }) => isActive ? "active" : ""}
                  end={item.path === "/"}
                >
                  <item.icon size={18} />
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
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
