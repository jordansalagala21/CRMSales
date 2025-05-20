// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/firebase"; // Ensure this path is correct
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence, // <--- Import this
  browserSessionPersistence, // <--- Import this
} from "firebase/auth";
import type { User } from "firebase/auth";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // Optional: for initial auth state check
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false); // Auth state determined
      if (currentUser) {
        // Conditional navigation: Only navigate if not already on a protected/dashboard path
        // or based on specific logic. For now, keeping user's original logic.
        // However, the navigate in login function might be more direct for post-login.
        // navigate("/dashboard"); // User's original: Redirect authenticated users to dashboard
      }
      // No redirect for unauthenticated users here; App.tsx's ProtectedRoute handles routing
    });
    return () => unsubscribe();
  }, []); // Removed navigate from dependency array as it's stable from react-router-dom v6

  const login = async (email: string, password: string) => {
    try {
      // Set persistence to 'session' for this login attempt
      // This means the user will be logged out when the browser/tab is closed.
      await setPersistence(auth, browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      // After successful login, onAuthStateChanged will trigger,
      // setting the user state and potentially navigating if configured there.
      // The navigate below ensures redirection if onAuthStateChanged is slow or doesn't redirect.
      navigate("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      // Re-throw the error or handle it (e.g., show a message to the user)
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    // onAuthStateChanged will set user to null.
    // ProtectedRoute will then redirect from dashboard if user tries to access it.
    navigate("/home"); // Redirect to a public page like home after logout
  };

  // Optional: Show a loading indicator or null while auth state is being determined
  // if (loadingAuth) {
  //   return <p>Loading authentication...</p>; // Or a spinner component
  // }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
