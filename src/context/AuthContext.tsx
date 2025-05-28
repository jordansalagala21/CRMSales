// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebase/firebase"; // Ensure this path is correct
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence, // Keep this import
  browserLocalPersistence, // <--- CHANGE: Import browserLocalPersistence
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
    // It's good practice to set persistence once, ideally before any auth operations
    // or at the app's initialization. However, setting it before signInWithEmailAndPassword
    // as you did is also a common pattern. For this example, we'll keep it in the login function
    // to directly address your specific code structure.
    // If you wanted to set it globally for all sign-in methods, you might do it here
    // or even earlier in your app's lifecycle, but ensure it's called before any sign-in attempt.
    // Example of setting it once (though not strictly necessary if done before each login):
    // setPersistence(auth, browserLocalPersistence)
    //   .then(() => {
    //     console.log("Auth persistence set to local.");
    //   })
    //   .catch((error) => {
    //     console.error("Error setting auth persistence:", error);
    //   });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false); // Auth state determined
      // Conditional navigation can be handled by ProtectedRoute components
      // or by specific logic after login/logout actions.
      // The original navigate("/dashboard") in onAuthStateChanged might cause
      // issues if the user is already on the dashboard or if there are
      // multiple onAuthStateChanged triggers.
    });
    return () => unsubscribe();
  }, []); // navigate is stable and usually doesn't need to be in dependencies

  const login = async (email: string, password: string) => {
    try {
      // Set persistence to 'local' for this login attempt.
      // This means the user will stay logged in even after the browser/tab is closed.
      await setPersistence(auth, browserLocalPersistence); // <--- CHANGE: Use browserLocalPersistence
      await signInWithEmailAndPassword(auth, email, password);
      // After successful login, onAuthStateChanged will trigger,
      // setting the user state.
      // Navigating here ensures the user is redirected immediately after login.
      navigate("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      // It's good practice to provide user feedback for login errors.
      // For example, setting an error state that a UI component can display.
      throw error; // Re-throw for the calling component to handle if needed
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null.
      // Your routing setup (e.g., ProtectedRoute) should handle redirecting
      // the user away from protected pages.
      navigate("/home"); // Redirect to a public page like home after logout
    } catch (error) {
      console.error("Logout failed:", error);
      // Handle logout errors if necessary
    }
  };

  // Optional: Show a loading indicator or null while auth state is being determined
  // This can prevent brief flashes of content intended for unauthenticated/authenticated users.
  if (loadingAuth) {
    // You can return a loading spinner or a blank screen.
    // For example: return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;
    return null; // Or your preferred loading component
  }

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
