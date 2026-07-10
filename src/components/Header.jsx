import React from "react";
import { useAuth } from "../lib/auth";

const Header = () => {
  const { user } = useAuth();

  if (!user) return null;

  const initials = user.fullName
    ? user.fullName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
    : "U";

  return (
    <header className="top-header">
      <div className="header-left">
        {/* Placeholder for breadcrumb or brand if needed */}
      </div>

      <div className="header-right">
        {/* User Details & Avatar */}
        <div className="header-profile" style={{ borderLeft: "none", paddingLeft: 0 }}>
          <div className="profile-details">
            <span className="profile-name">{user.fullName}</span>
            <span className="profile-role">{user.role?.toUpperCase()}</span>
          </div>
          <div className="profile-avatar">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
