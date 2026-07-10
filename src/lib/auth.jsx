import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = async (uid) => {
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

  useEffect(() => {
    // Fetch initial session state
    const getInitialSession = async () => {
      setLoading(true);
      setError("");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (profile) {
            if (profile.status === "inactive") {
              await supabase.auth.signOut();
              setUser(null);
              setError("Your account has been deactivated. Please contact the administrator.");
            } else {
              setUser({
                uid: session.user.id,
                email: session.user.email,
                fullName: profile.full_name,
                phone: profile.phone,
                role: profile.role,
                status: profile.status,
                createdAt: {
                  seconds: Math.floor(new Date(profile.created_at).getTime() / 1000),
                  toDate: () => new Date(profile.created_at)
                }
              });
            }
          } else {
            // Profile fallback if not populated yet
            setUser({
              uid: session.user.id,
              email: session.user.email,
              role: "employee",
              status: "active"
            });
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Session fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for authentication changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      setError("");
      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id);
          if (profile) {
            if (profile.status === "inactive") {
              await supabase.auth.signOut();
              setUser(null);
              setError("Your account has been deactivated. Please contact the administrator.");
            } else {
              setUser({
                uid: session.user.id,
                email: session.user.email,
                fullName: profile.full_name,
                phone: profile.phone,
                role: profile.role,
                status: profile.status,
                createdAt: {
                  seconds: Math.floor(new Date(profile.created_at).getTime() / 1000),
                  toDate: () => new Date(profile.created_at)
                }
              });
            }
          } else {
            setUser({
              uid: session.user.id,
              email: session.user.email,
              role: "employee",
              status: "active"
            });
          }
        } catch (err) {
          console.error("Auth state change error:", err);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setError("");
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;
      
      // Fetch profile to verify active status immediately
      const profile = await fetchProfile(data.user.id);
      if (profile && profile.status === "inactive") {
        await supabase.auth.signOut();
        setUser(null);
        const deactiveMsg = "Your account has been deactivated. Please contact the administrator.";
        setError(deactiveMsg);
        throw new Error(deactiveMsg);
      }

      return data.user;
    } catch (err) {
      setLoading(false);
      let errMsg = "Failed to sign in. Please check your credentials.";
      if (err.message === "Invalid login credentials") {
        errMsg = "Invalid email or password.";
      } else if (err.message) {
        errMsg = err.message;
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
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setLoading(false);
    }
  };

  const registerEmployeeCredentials = async (email, password) => {
    throw new Error("registerEmployeeCredentials is deprecated. Use addEmployee(data, password) instead.");
  };

  const isAdmin = user?.role === "admin";

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
