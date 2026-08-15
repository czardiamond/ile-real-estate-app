import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
  AuthError,
  UserCredential,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

export interface UserProfileData {
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  signInWithEmail: (email: string, pass: string) => Promise<UserCredential>;
  signUpWithEmail: (email: string, pass: string, displayName?: string) => Promise<UserCredential>;
  signInWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Maps Firebase Auth error codes to user-friendly messages for the Ilé Real Estate platform.
 */
function getReadableAuthErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "auth/invalid-email":
      return "The email address is formatted incorrectly.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact Ilé support.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password. Please verify your credentials.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists.";
    case "auth/weak-password":
      return "The password is too weak. Please use at least 6 characters with numbers or symbols.";
    case "auth/popup-closed-by-user":
      return "Google sign-in popup was closed before completing authentication.";
    case "auth/popup-blocked":
      return "Sign-in popup was blocked by your browser. Please allow popups for Ilé.";
    case "auth/network-request-failed":
      return "Network connection error. Please check your internet connectivity and try again.";
    case "auth/too-many-requests":
      return "Access to this account has been temporarily disabled due to many failed login attempts. Please reset your password or try again later.";
    default:
      return error.message || "An unexpected authentication error occurred. Please try again.";
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => {
    setError(null);
  };

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
      (err) => {
        console.error("Ilé AuthState Listener Error:", err);
        setError("Failed to synchronize authentication session state.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string): Promise<UserCredential> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      return userCredential;
    } catch (err) {
      const authError = err as AuthError;
      const readableMessage = getReadableAuthErrorMessage(authError);
      setError(readableMessage);
      throw new Error(readableMessage);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    displayName?: string
  ): Promise<UserCredential> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: displayName.trim(),
        });
        // Refresh local user state with updated profile information
        setUser({ ...userCredential.user, displayName: displayName.trim() });
      }
      
      return userCredential;
    } catch (err) {
      const authError = err as AuthError;
      const readableMessage = getReadableAuthErrorMessage(authError);
      setError(readableMessage);
      throw new Error(readableMessage);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<UserCredential> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      return userCredential;
    } catch (err) {
      const authError = err as AuthError;
      const readableMessage = getReadableAuthErrorMessage(authError);
      setError(readableMessage);
      throw new Error(readableMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      const authError = err as AuthError;
      const readableMessage = getReadableAuthErrorMessage(authError);
      setError(readableMessage);
      throw new Error(readableMessage);
    } finally {
      setLoading(false);
    }
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    error,
    clearError,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider component.");
  }
  return context;
};
