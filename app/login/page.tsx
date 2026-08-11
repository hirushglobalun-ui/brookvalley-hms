"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";
import { seedInitialData, createFirstAdminUser } from "../../lib/db";
import { supabase } from "../../lib/supabase";
import { KeyRound, Mail, ShieldAlert, Eye, EyeOff } from "lucide-react";

const Spinner = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ animation: "spin 0.8s linear infinite", display: "inline-block", flexShrink: 0 }}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const { login, error: authError, setError: setAuthError } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    setAuthError("");
    
    if (!email || !password) {
      setLocalError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Login failed error:", err);
      const errMsg = typeof err === "string" ? err : err?.message || "Invalid email or password.";
      setLocalError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (err: any): string => {
    if (!err) return "";
    let str = "";
    if (typeof err === "string") {
      str = err.trim();
    } else if (typeof err === "object" && err !== null) {
      if (typeof err.message === "string") str = err.message.trim();
      else if (typeof err.error_description === "string") str = err.error_description.trim();
    }
    if (!str || str === "{}" || str === "[object Object]") return "";
    return str;
  };

  const activeError = getErrorMessage(localError) || getErrorMessage(authError);

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-header" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <img 
            src="/image-Photoroom (27).png" 
            alt="Brookvalley Logo" 
            style={{ height: "96px", objectFit: "contain", marginBottom: "0.25rem" }} 
          />
          <h1 className="auth-title" style={{ marginTop: 0, fontSize: "1.5rem" }}>Brookvalley HMS</h1>
        </div>

        {activeError && (
          <div 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.5rem", 
              backgroundColor: "var(--danger-glow)", 
              color: "var(--danger)",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.825rem",
              marginBottom: "1.25rem",
              border: "1px solid rgba(244, 63, 94, 0.2)"
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{activeError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="search-input-wrapper">
              <Mail className="search-input-icon" />
              <input 
                type="email" 
                id="email" 
                className="input-control search-input" 
                placeholder="name@hotel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="search-input-wrapper" style={{ position: "relative" }}>
              <KeyRound className="search-input-icon" />
              <input 
                type={showPassword ? "text" : "password"} 
                id="password" 
                className="input-control search-input" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                style={{ paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px"
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              width: "100%", 
              marginTop: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner size={16} />
                <span>Signing in...</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;
