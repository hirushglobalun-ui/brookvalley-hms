"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";
import { seedInitialData, createFirstAdminUser } from "../../lib/db";
import { supabase } from "../../lib/supabase";
import { KeyRound, Mail, ShieldAlert, Eye, EyeOff } from "lucide-react";

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
      const errMsg = err.message || "";
      
      // If rate limited by Supabase, show friendly message and stop
      if (errMsg.includes("Too many") || errMsg.includes("rate limit")) {
        setLocalError("Too many attempts. Please wait a moment and try again.");
        setLoading(false);
        return;
      }

      // Auto-initialize when logging in with admin credentials for the first time
      if (email === "admin@brookvalley.com" && password === "admin123") {
        try {
          const { data, error: signUpErr } = await supabase.auth.signUp({
            email: "admin@brookvalley.com",
            password: "admin123",
            options: {
              data: {
                full_name: "System Admin"
              }
            }
          });
          
          let uid = data?.user?.id;
          
          if (signUpErr) {
            if (signUpErr.message.includes("already registered") || signUpErr.message.includes("already exists")) {
              // User exists — just need to login, will be handled below
            } else {
              throw signUpErr;
            }
          }
          
          if (uid) {
            await createFirstAdminUser(uid, "admin@brookvalley.com", "System Admin");
          }
          
          // Log in now that user exists in database
          await login(email, password);
          try {
            await seedInitialData(true);
          } catch (seedErr: any) {
            console.warn("Seeding initial room configurations failed:", seedErr);
          }
          router.push("/dashboard");
          return;
        } catch (initErr: any) {
          console.error("Auto-initialization fallback failed:", initErr);
          setLocalError(initErr.message || "Setup failed. Please try again.");
        }
      } else if (email === "dev@hirush.com" && password === "Qweask@11") {
        try {
          const { data, error: signUpErr } = await supabase.auth.signUp({
            email: "dev@hirush.com",
            password: "Qweask@11",
            options: {
              data: {
                full_name: "Developer User"
              }
            }
          });
          
          let uid = data?.user?.id;
          
          if (signUpErr) {
            if (signUpErr.message.includes("already registered") || signUpErr.message.includes("already exists")) {
              // User exists — just need to login
            } else {
              throw signUpErr;
            }
          }
          
          if (uid) {
            await createFirstAdminUser(uid, "dev@hirush.com", "Developer User");
          }
          
          // Log in now that user exists in database
          await login(email, password);
          router.push("/dashboard");
          return;
        } catch (initErr: any) {
          console.error("Developer auto-initialization fallback failed:", initErr);
          setLocalError(initErr.message || "Developer setup failed. Please try again.");
        }
      } else {
        console.error("Login failed error:", err);
        setLocalError(errMsg || "Failed to sign in.");
      }
    } finally {
      setLoading(false);
    }
  };

  const activeError = localError || authError;

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
            style={{ width: "100%", marginTop: "1rem" }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Login;
