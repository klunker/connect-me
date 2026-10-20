import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, Auth } from "firebase/auth";
// @ts-ignore
import { getReactNativePersistence } from "@firebase/auth/dist/rn/index.js";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyBeg25IORosT50xB-d4eWLE5V1TmvwPJoE",
  authDomain: "connectme-app-38337.firebaseapp.com",
  projectId: "connectme-app-38337",
  storageBucket: "connectme-app-38337.firebasestorage.app",
  messagingSenderId: "1074216632481",
  appId: "1:1074216632481:web:5cce1ea079afa9f80770e0",
  measurementId: "G-QQYV7RRJP4"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (e) {
  // If already initialized, get standard auth instance
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
