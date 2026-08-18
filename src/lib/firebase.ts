import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import appletConfig from "../../firebase-applet-config.json";

// Read from Vite / process environment variables with fallback to firebase-applet-config.json
const getEnvOrConfig = (keys: (string | undefined)[], fallback: string | undefined): string => {
  for (const val of keys) {
    if (val && typeof val === "string" && val.trim() !== "" && val !== "undefined" && val !== "null" && !val.startsWith("YOUR_")) {
      return val.trim();
    }
  }
  return (fallback || "").trim();
};

const procEnv = (typeof process !== "undefined" && process?.env) ? process.env : {};

const firebaseConfig = {
  apiKey: getEnvOrConfig([import.meta.env?.VITE_FIREBASE_API_KEY, procEnv.VITE_FIREBASE_API_KEY, procEnv.FIREBASE_API_KEY], appletConfig.apiKey),
  authDomain: getEnvOrConfig([import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN, procEnv.VITE_FIREBASE_AUTH_DOMAIN, procEnv.FIREBASE_AUTH_DOMAIN], appletConfig.authDomain),
  projectId: getEnvOrConfig([import.meta.env?.VITE_FIREBASE_PROJECT_ID, procEnv.VITE_FIREBASE_PROJECT_ID, procEnv.FIREBASE_PROJECT_ID], appletConfig.projectId),
  storageBucket: getEnvOrConfig([import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET, procEnv.VITE_FIREBASE_STORAGE_BUCKET, procEnv.FIREBASE_STORAGE_BUCKET], appletConfig.storageBucket),
  messagingSenderId: getEnvOrConfig([import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID, procEnv.VITE_FIREBASE_MESSAGING_SENDER_ID, procEnv.FIREBASE_MESSAGING_SENDER_ID], appletConfig.messagingSenderId),
  appId: getEnvOrConfig([import.meta.env?.VITE_FIREBASE_APP_ID, procEnv.VITE_FIREBASE_APP_ID, procEnv.FIREBASE_APP_ID], appletConfig.appId),
  measurementId: getEnvOrConfig([import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID, procEnv.VITE_FIREBASE_MEASUREMENT_ID, procEnv.FIREBASE_MEASUREMENT_ID], appletConfig.measurementId),
};

// Initialize Firebase safely (prevents duplicate initialization during HMR / hot reloads)
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize core Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Configure Google OAuth Provider
export const googleProvider: GoogleAuthProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export default app;
