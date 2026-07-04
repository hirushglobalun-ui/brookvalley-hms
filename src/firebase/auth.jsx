import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  getAuth
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { auth, db, firebaseConfig } from "./config";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError("");
      
      if (firebaseUser) {
        try {
          // Fetch additional profile info from Firestore users collection
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            if (userData.status === "inactive") {
              await signOut(auth);
              setUser(null);
              setError("Your account has been deactivated. Please contact the administrator.");
            } else {
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                ...userData
              });
            }
          } else {
            // Document doesn't exist, sign out or create fallback
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: "employee", // Default fallback
              status: "active"
            });
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setError("Failed to load user profile details.");
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    setError("");
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Profile fetch is handled by onAuthStateChanged subscription
      return userCredential.user;
    } catch (err) {
      setLoading(false);
      let errMsg = "Failed to sign in. Please check your credentials.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        errMsg = "Invalid email or password.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "Invalid email format.";
      }
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to register employee via secondary App instance (workaround)
  const registerEmployeeCredentials = async (email, password) => {
    // Generate a unique name for the secondary App instance
    const secondaryAppName = `SecondaryApp_${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);
    
    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = credential.user.uid;
      
      // Sign out immediately on secondary app and delete it to clean up resource
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);
      
      return newUid;
    } catch (err) {
      await deleteApp(secondaryApp);
      let errMsg = "Failed to create credentials.";
      if (err.code === "auth/email-already-in-use") {
        errMsg = "This email is already registered.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "Password is too weak (min 6 characters).";
      }
      throw new Error(errMsg);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    registerEmployeeCredentials,
    setError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
