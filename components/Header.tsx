"use client";

import React from "react";
import { useAuth } from "../lib/auth";

/**
 * Top header layout component of the hotel management panel.
 * Displays user identity profiles, role details, and screen navigation summaries.
 * 
 * @returns React Component or null if not authenticated.
 */
const Header: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const initials = user.fullName
    ? user.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
    : "U";

  return (
    <header className="top-header" role="banner" aria-label="Top Navigation Bar">
      <div className="header-left">
        {/* Placeholder for breadcrumb or brand if needed */}
      </div>

      <div className="header-right">
        {/* User Details & Avatar */}
        <div className="header-profile" style={{ borderLeft: "none", paddingLeft: 0 }} aria-label={`Logged in profile: ${user.fullName}`}>
          <div className="profile-details">
            <span className="profile-name">{user.fullName}</span>
            <span className="profile-role">{user.role?.toUpperCase()}</span>
          </div>
          <div className="profile-avatar" aria-hidden="true">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
