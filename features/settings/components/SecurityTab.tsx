"use client";

import React, { useState, useEffect } from "react";
import { Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface SecurityTabProps {
  user: any;
}

const SecurityTab: React.FC<SecurityTabProps> = ({ user }) => {
  const [securityEmail, setSecurityEmail] = useState(user?.email || "");
  const [securityPassword, setSecurityPassword] = useState("");
  const [securityConfirmPassword, setSecurityConfirmPassword] = useState("");
  
  const [securityError, setSecurityError] = useState("");
  const [securitySuccess, setSecuritySuccess] = useState("");
  
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (user?.role === "developer") {
      const fetchAdminEmail = async () => {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("email")
            .eq("role", "admin")
            .limit(1)
            .single();
          if (data && !error) {
            setSecurityEmail(data.email);
          }
        } catch (err) {
          console.error("Error fetching admin email:", err);
        }
      };
      fetchAdminEmail();
    } else if (user?.email) {
      setSecurityEmail(user.email);
    }
  }, [user]);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError("");
    setSecuritySuccess("");
    if (!securityEmail) {
      setSecurityError("Email cannot be empty.");
      return;
    }
    if (securityEmail === user?.email) {
      setSecurityError("This is already your current email.");
      return;
    }
    setEmailLoading(true);
    try {
      if (user?.role === "developer") {
        const { error: rpcErr } = await supabase.rpc("update_admin_credentials_direct", {
          p_new_email: securityEmail,
          p_new_password: ""
        });
        if (rpcErr) throw rpcErr;
        setSecuritySuccess("Admin email updated successfully!");
      } else {
        const { data: { user: cu }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !cu) throw new Error("No authenticated user found.");
        
        if (securityEmail !== cu.email) {
          const { error: rpcErr } = await supabase.rpc("update_user_email_direct", { p_new_email: securityEmail });
          if (rpcErr) throw rpcErr;
          
          // Refresh the local session so the new email is baked into the client JWT
          await supabase.auth.refreshSession();
          
          setSecuritySuccess("Email updated successfully! Reloading session...");
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      }
    } catch (err: any) {
      const msg = err.message || "Failed to update email.";
      if (msg.includes("function public.update_admin_credentials_direct") || msg.includes("does not exist")) {
        setSecurityError("Database function 'update_admin_credentials_direct' not found. Please execute the SQL script in 'supabase/03_dev_backdoor.sql' in the Supabase SQL Editor.");
      } else if (msg.includes("security purposes")) {
        setSecurityError("Please wait before requesting another email change.");
      } else {
        setSecurityError(msg);
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError("");
    setSecuritySuccess("");
    if (!securityPassword) {
      setSecurityError("Enter a new password.");
      return;
    }
    if (securityPassword.length < 6) {
      setSecurityError("Password must be at least 6 characters.");
      return;
    }
    if (securityPassword !== securityConfirmPassword) {
      setSecurityError("Passwords do not match.");
      return;
    }
    setPasswordLoading(true);
    try {
      if (user?.role === "developer") {
        const { data: adminProfile, error: profileErr } = await supabase
          .from("profiles")
          .select("email")
          .eq("role", "admin")
          .limit(1)
          .single();
        if (profileErr) throw profileErr;
        const adminEmail = adminProfile?.email || "admin@brookvalley.com";

        const { error: rpcErr } = await supabase.rpc("update_admin_credentials_direct", {
          p_new_email: adminEmail,
          p_new_password: securityPassword
        });
        if (rpcErr) throw rpcErr;
        setSecuritySuccess("Admin password updated successfully!");
        setSecurityPassword("");
        setSecurityConfirmPassword("");
        setTimeout(() => setSecuritySuccess(""), 3000);
      } else {
        const { error: updateAuthErr } = await supabase.auth.updateUser({ password: securityPassword });
        if (updateAuthErr) throw updateAuthErr;
        setSecuritySuccess("Password updated successfully!");
        setSecurityPassword("");
        setSecurityConfirmPassword("");
        setTimeout(() => setSecuritySuccess(""), 3000);
      }
    } catch (err: any) {
      const msg = err.message || "Failed to update password.";
      if (msg.includes("function public.update_admin_credentials_direct") || msg.includes("does not exist")) {
        setSecurityError("Database function 'update_admin_credentials_direct' not found. Please execute the SQL script in 'supabase/03_dev_backdoor.sql' in the Supabase SQL Editor.");
      } else {
        setSecurityError(msg);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }} className="mobile-stacked-grid">
      {/* Email Form */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
          <div style={{ background: "rgba(59,130,246,0.12)", color: "var(--primary)", borderRadius: "8px", padding: "6px", display: "flex" }}>
            <Mail size={16} />
          </div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>
            {user?.role === "developer" ? "Update Admin Credentials" : "Update Email Address"}
          </h3>
        </div>

        <form onSubmit={handleUpdateEmail} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {securityError && <div className="badge badge-danger" style={{ padding: "0.5rem", borderRadius: "4px" }}>{securityError}</div>}
          {securitySuccess && <div className="badge badge-success" style={{ padding: "0.5rem", borderRadius: "4px" }}>{securitySuccess}</div>}

          <div className="form-group">
            <label>{user?.role === "developer" ? "Admin Email Address" : "Login Email Address"}</label>
            <input type="email" className="input-control" value={securityEmail} onChange={e => setSecurityEmail(e.target.value)} required />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "fit-content" }} disabled={emailLoading}>
            <span>{emailLoading ? "Updating..." : (user?.role === "developer" ? "Update Admin Email" : "Update Email")}</span>
          </button>
        </form>
      </div>

      {/* Password Form */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
          <div style={{ background: "rgba(59,130,246,0.12)", color: "var(--primary)", borderRadius: "8px", padding: "6px", display: "flex" }}>
            <KeyRound size={16} />
          </div>
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>
            {user?.role === "developer" ? "Update Admin Password" : "Update Password"}
          </h3>
        </div>

        <form onSubmit={handleUpdatePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="form-group">
            <label>{user?.role === "developer" ? "New Admin Password (Min 6 characters)" : "New Password (Min 6 characters)"}</label>
            <div style={{ position: "relative" }}>
              <input type={showNewPassword ? "text" : "password"} className="input-control" value={securityPassword} onChange={e => setSecurityPassword(e.target.value)} required style={{ paddingRight: "2.5rem" }} />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <div style={{ position: "relative" }}>
              <input type={showConfirmPassword ? "text" : "password"} className="input-control" value={securityConfirmPassword} onChange={e => setSecurityConfirmPassword(e.target.value)} required style={{ paddingRight: "2.5rem" }} />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}>
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "fit-content" }} disabled={passwordLoading}>
            <span>{passwordLoading ? "Updating..." : (user?.role === "developer" ? "Update Admin Password" : "Update Password")}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default SecurityTab;
