import { create } from "zustand";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";

export interface UserProfile {
  displayName: string;
  email?: string;
  phone?: string;
  pushToken?: string;
  reliabilityScore: number;
  createdAt: any;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  initAuth: () => () => void;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  initAuth: () => {
    set({ isLoading: true });
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        set({ user });
        // Fetch or create profile doc
        try {
          const userDocRef = doc(db, "users", user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            set({ profile: snap.data() as UserProfile, isLoading: false });
          } else {
            // Initialize user doc conforming to firestore.rules
            const newProfile: UserProfile = {
              displayName: user.displayName || user.email?.split("@")[0] || "User",
              email: user.email || undefined,
              reliabilityScore: 1.0,
              createdAt: serverTimestamp(),
            };
            await setDoc(userDocRef, newProfile);
            set({ profile: newProfile, isLoading: false });
          }
        } catch (e: any) {
          console.warn("Failed to fetch user profile:", e);
          set({ isLoading: false });
        }
      } else {
        set({ user: null, profile: null, isLoading: false });
      }
    });

    return unsubscribe;
  },

  signIn: async (email: string, pass: string) => {
    set({ isLoading: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (e: any) {
      set({ error: e.message || "Failed to sign in", isLoading: false });
      throw e;
    }
  },

  signUp: async (email: string, pass: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      await firebaseUpdateProfile(cred.user, { displayName: name.trim() });

      // Create profile in Firestore
      const userDocRef = doc(db, "users", cred.user.uid);
      const newProfile: UserProfile = {
        displayName: name.trim(),
        email: email.trim(),
        reliabilityScore: 1.0,
        createdAt: serverTimestamp(),
      };
      await setDoc(userDocRef, newProfile);
      set({ profile: newProfile, user: cred.user, isLoading: false });
    } catch (e: any) {
      set({ error: e.message || "Failed to sign up", isLoading: false });
      throw e;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await firebaseSignOut(auth);
      set({ user: null, profile: null, isLoading: false });
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },
}));
