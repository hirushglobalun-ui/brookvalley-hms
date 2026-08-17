"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { setServerCookie, removeServerCookie, checkLoginRateLimit, resetLoginRateLimit } from "../features/auth/actions/authActions";

const AuthContext = createContext<any>(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = async (uid: string) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        return null;
      }
      return profile;
    } catch (err) {
      console.error("Error in fetchProfile:", err);
      return null;
    }
  };

  const syncCookie = async (session: any) => {
    if (session) {
      // Keep the session cookie for 30 days to prevent premature auto-logout
      const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
      await setServerCookie("sb-access-token", session.access_token, maxAge);
    } else {
      await removeServerCookie("sb-access-token");
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Listen for authentication changes (handles INITIAL_SESSION, SIGNED_IN, SIGNED_OUT)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Background token refresh - sync cookie without setting full page loading state
      if (event === "TOKEN_REFRESHED") {
        if (session) await syncCookie(session);
        return;
      }
      
      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id);
          if (!isMounted) return;

          if (profile) {
            if (profile.status === "inactive") {
              await supabase.auth.signOut();
              if (isMounted) {
                setUser(null);
                await syncCookie(null);
                setError("Your account has been deactivated. Please contact the administrator.");
              }
            } else {
              await syncCookie(session);
              if (isMounted) {
                setUser({
                  id: session.user.id,
                  uid: session.user.id,
                  email: session.user.email,
                  fullName: profile.full_name,
                  phone: profile.phone,
                  role: session.user.email === "dev@hirush.com" ? "developer" : profile.role,
                  status: profile.status,
                  createdAt: {
                    seconds: Math.floor(new Date(profile.created_at).getTime() / 1000),
                    toDate: () => new Date(profile.created_at)
                  }
                });
              }
            }
          } else {
            await syncCookie(session);
            if (isMounted) {
              setUser({
                id: session.user.id,
                uid: session.user.id,
                email: session.user.email,
                role: session.user.email === "dev@hirush.com" ? "developer" : "employee",
                status: "active"
              });
            }
          }
        } catch (err) {
          console.error("Auth state change error:", err);
        } finally {
          if (isMounted) setLoading(false);
        }
      } else {
        await syncCookie(null);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password:  string) => {
    setError("");
    setLoading(true);
    try {
      // 1. Check server-side rate limit first
      const rateLimitRes = await checkLoginRateLimit(email);
      if (!rateLimitRes.allowed) {
        throw new Error(rateLimitRes.message || "Too many login attempts.");
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;

      // 2. Reset rate limit non-blocking
      resetLoginRateLimit(email).catch(console.error);

      return data.user;
    } catch (err: any) {
      setLoading(false);
      let errMsg = "Failed to sign in. Please check your credentials.";
      if (typeof err === "string" && err.trim() !== "{}") {
        errMsg = err.trim();
      } else if (err?.message && typeof err.message === "string" && err.message.trim() !== "{}") {
        errMsg = err.message === "Invalid login credentials" ? "Invalid email or password." : err.message.trim();
      } else if (err?.error_description && typeof err.error_description === "string") {
        errMsg = err.error_description.trim();
      }
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      await syncCookie(null);
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setLoading(false);
    }
  };

  const registerEmployeeCredentials = async (_email: string, _password: string) => {
    throw new Error("registerEmployeeCredentials is deprecated. Use addEmployee(data, password) instead.");
  };

  const isAdmin = user?.role === "admin" || user?.role === "developer" || user?.role === "manager";

  const value = {
    user,
    profile: user,
    loading,
    error,
    login,
    logout,
    registerEmployeeCredentials,
    setError,
    isAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
