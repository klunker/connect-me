import { create } from "zustand";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, deleteField } from "firebase/firestore";
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
  updateProfile: (name: string, phone?: string) => Promise<void>;
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
            // Initialize user doc conforming to firestore.rules.
            // Undefined values are not allowed by the Firestore SDK, so only
            // present fields are written.
            const newProfile: UserProfile = {
              displayName: user.displayName || user.email?.split("@")[0] || "User",
              reliabilityScore: 1.0,
              createdAt: serverTimestamp(),
            };
            if (user.email) newProfile.email = user.email;
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

  updateProfile: async (name: string, phone?: string) => {
    const { user, profile } = get();
    if (!user) {
      set({ error: "Not authenticated" });
      throw new Error("Not authenticated");
    }
    set({ error: null });
    try {
      const cleanName = name.trim();
      const cleanPhone = (phone || "").trim();

      // Firestore is the source of truth. Never send `undefined` values:
      // the Firestore SDK rejects them ("Unsupported field value: undefined").
      // Clearing the phone is done with deleteField() so the key is removed.
      const userDocRef = doc(db, "users", user.uid);
      const payload: Record<string, unknown> = {
        displayName: cleanName,
        updatedAt: serverTimestamp(),
        phone: cleanPhone ? cleanPhone : deleteField(),
      };
      await setDoc(userDocRef, payload, { merge: true });

      // Firebase Auth is secondary - it can require a recent login, which must
      // not block the actual profile update.
      try {
        await firebaseUpdateProfile(user, { displayName: cleanName });
      } catch (authError: any) {
        console.warn("Auth displayName update skipped:", authError?.message);
      }

      set({
        profile: profile
          ? { ...profile, displayName: cleanName, phone: cleanPhone || undefined }
          : null,
      });
    } catch (e: any) {
      set({ error: e.message || "Failed to update profile" });
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
