import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../config/firebase.js";
import { subscribeAdminRecord } from "../services/adminAuthService.js";
import { ROLES, canAccessAdmin } from "../utils/permissions.js";

const AuthContext = createContext(null);

function createUserProfile(user, name) {
  return {
    name: name || user.displayName || "LockOn Learner",
    email: user.email,
    role: ROLES.USER,
    xp: 0,
    energy: 0,
    totalScore: 0,
    completedTests: [],
    completedUnits: [],
    lastTestAttempt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

async function ensureUserDocument(user, name) {
  if (!db) return;

  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, createUserProfile(user, name));
    return;
  }

  const data = snapshot.data();
  const patch = {};
  const xp = typeof data.xp === "number" ? data.xp : 0;
  const energy = typeof data.energy === "number" ? data.energy : 0;

  if (!data.name) patch.name = name || user.displayName || "LockOn Learner";
  if (typeof data.xp !== "number") patch.xp = 0;
  if (typeof data.energy !== "number") patch.energy = 0;
  if (typeof data.totalScore !== "number") patch.totalScore = xp + energy * 100;
  if (!Array.isArray(data.completedTests)) patch.completedTests = [];
  if (!Array.isArray(data.completedUnits)) patch.completedUnits = [];
  if (!("lastTestAttempt" in data)) patch.lastTestAttempt = null;

  if (Object.keys(patch).length) {
    patch.updatedAt = serverTimestamp();
    await setDoc(userRef, patch, { merge: true });
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [adminRecord, setAdminRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await ensureUserDocument(firebaseUser);
        } catch (error) {
          console.error("Failed to sync user profile:", error);
        }
      } else {
        setProfile(null);
        setAdminRecord(null);
      }
      setUser(firebaseUser);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user || !db) return undefined;
    return onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        setProfile(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
      },
      (error) => {
        console.error("Profile listener error:", error);
        setProfile(null);
      },
    );
  }, [user]);

  useEffect(() => {
    if (!user?.uid) {
      setAdminRecord(null);
      return undefined;
    }
    return subscribeAdminRecord(user.uid, setAdminRecord);
  }, [user?.uid]);

  const isAdmin = canAccessAdmin(adminRecord);

  const value = useMemo(
    () => ({
      user,
      profile,
      adminRecord,
      isAdmin,
      loading,
      isFirebaseConfigured,
      async login(email, password) {
        if (!auth) throw new Error("Firebase is not configured.");
        await signInWithEmailAndPassword(auth, email, password);
      },
      async register(name, email, password) {
        if (!auth) throw new Error("Firebase is not configured.");
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        await ensureUserDocument(result.user, name);
      },
      logout: () => (auth ? signOut(auth) : undefined),
    }),
    [adminRecord, isAdmin, loading, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
