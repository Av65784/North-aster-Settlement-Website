import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase.js";

/**
 * @typedef {import('../types/firestore.ts').AdminUser} AdminUser
 */

export async function fetchAdminRecord(uid) {
  if (!db || !uid) return null;
  const snapshot = await getDoc(doc(db, "adminUsers", uid));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() };
}

export function subscribeAdminRecord(uid, callback) {
  if (!db || !uid) {
    callback(null);
    return () => {};
  }

  return onSnapshot(
    doc(db, "adminUsers", uid),
    (snapshot) => {
      callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    () => callback(null),
  );
}

export async function assertAdminAccess(uid) {
  const record = await fetchAdminRecord(uid);
  if (!record?.active) {
    throw new Error("Admin access required.");
  }
  return record;
}

export function isActiveAdminRecord(record) {
  return Boolean(record?.active && record?.uid);
}
