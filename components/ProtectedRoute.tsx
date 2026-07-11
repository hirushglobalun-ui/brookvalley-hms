"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

/**
 * Properties expected by the ProtectedRoute component.
 */
interface ProtectedRouteProps {
  /** The child elements to render if authentication and authorization check passes. */
  children: React.ReactNode;
  /** Optional array of allowed roles to filter page visibility (e.g. ['admin']). */
  allowedRoles?: string[];
}

/**
 * Route authorization guard wrapper for client-rendered pages.
 * Handles loading spinner states and conditional router redirects.
 * 
 * @param props - ProtectedRouteProps interface fields.
 * @returns React Component or null.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.replace("/dashboard");
      }
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#090d16",
        color: "#f9fafb",
        gap: "1rem"
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "4px solid rgba(99, 102, 241, 0.1)",
          borderTop: "4px solid #6366f1",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
        <p style={{ fontSize: "0.9rem", color: "#9ca3af", fontWeight: 500 }}>
          Loading user details...
        </p>
      </div>
    );
  }

  if (!user || (allowedRoles && !allowedRoles.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
