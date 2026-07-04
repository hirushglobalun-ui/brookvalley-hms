import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../firebase/auth";
import { seedInitialData, createFirstAdminUser } from "../firebase/db";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";
import { Hotel, KeyRound, Mail, ShieldAlert, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const { login, error: authError, setError: setAuthError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
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
      navigate("/");
    } catch (err) {
      // Auto-initialize when logging in with admin credentials for the first time
      if (email === "admin@brookvalley.com" && password === "admin123") {
        try {
          let uid;
          try {
            const creds = await createUserWithEmailAndPassword(auth, "admin@brookvalley.com", "admin123");
            uid = creds.user.uid;
          } catch (authErr) {
            if (authErr.code === "auth/email-already-in-use") {
              // Ignore, user exists
            } else {
              throw authErr;
            }
          }
          if (uid) {
            await createFirstAdminUser(uid, "admin@brookvalley.com", "System Admin");
          }
          await seedInitialData(true);
          // Log in again now that user exists in database
          await login(email, password);
          navigate("/");
          return;
        } catch (initErr) {
          console.error("Auto-initialization fallback failed:", initErr);
        }
      }
      setLocalError(err.message || "Failed to sign in.");
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
