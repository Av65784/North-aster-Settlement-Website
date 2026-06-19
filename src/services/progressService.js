import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase.js";
import { assertAdminAccess } from "./adminAuthService.js";
import { calculateTotalScore } from "./userService.js";

/**
 * @typedef {import('../types/firestore.ts').AdjustProgressInput} AdjustProgressInput
 * @typedef {import('../types/firestore.ts').ProgressTransaction} ProgressTransaction
 * @typedef {import('../types/firestore.ts').ModerationNote} ModerationNote
 */

export async function adjustUserXpWithHistory(adminUid, adminName, input) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");

  const userRef = doc(db, "users", input.userId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) throw new Error("User not found.");

    const data = snapshot.data();
    const nextXp = Math.max(0, Number(data.xp || 0) + Number(input.delta || 0));
    const nextTotal = calculateTotalScore(nextXp, data.energy || 0);

    transaction.update(userRef, {
      xp: nextXp,
      totalScore: nextTotal,
      updatedAt: serverTimestamp(),
    });

    const txRef = doc(collection(db, "xpTransactions"));
    /** @type {ProgressTransaction} */
    const txPayload = {
      userId: input.userId,
      userName: data.name || "User",
      delta: Number(input.delta || 0),
      reason: input.reason || "Admin adjustment",
      note: input.note || "",
      adminId: adminUid,
      adminName: adminName || "Admin",
      balanceAfter: nextXp,
      createdAt: serverTimestamp(),
    };
    transaction.set(txRef, txPayload);

    return { xp: nextXp, energy: data.energy || 0, totalScore: nextTotal, transactionId: txRef.id };
  });
}

export async function adjustUserEnergyWithHistory(adminUid, adminName, input) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");

  const userRef = doc(db, "users", input.userId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    if (!snapshot.exists()) throw new Error("User not found.");

    const data = snapshot.data();
    const nextEnergy = Math.max(0, Number(data.energy || 0) + Number(input.delta || 0));
    const nextTotal = calculateTotalScore(data.xp || 0, nextEnergy);

    transaction.update(userRef, {
      energy: nextEnergy,
      totalScore: nextTotal,
      updatedAt: serverTimestamp(),
    });

    const txRef = doc(collection(db, "energyTransactions"));
    transaction.set(txRef, {
      userId: input.userId,
      userName: data.name || "User",
      delta: Number(input.delta || 0),
      reason: input.reason || "Admin adjustment",
      note: input.note || "",
      adminId: adminUid,
      adminName: adminName || "Admin",
      balanceAfter: nextEnergy,
      createdAt: serverTimestamp(),
    });

    return { xp: data.xp || 0, energy: nextEnergy, totalScore: nextTotal, transactionId: txRef.id };
  });
}

export async function addModerationNote(adminUid, adminName, userId, note) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");
  if (!note.trim()) throw new Error("Note cannot be empty.");

  const userRef = doc(db, "users", userId);

  return runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("User not found.");
    const notes = Array.isArray(userDoc.data().moderationNotes) ? userDoc.data().moderationNotes : [];
    const entry = {
      id: `note-${Date.now()}`,
      note: note.trim(),
      adminId: adminUid,
      adminName: adminName || "Admin",
      createdAt: new Date().toISOString(),
    };
    transaction.update(userRef, {
      moderationNotes: [entry, ...notes].slice(0, 100),
      updatedAt: serverTimestamp(),
    });
    return entry;
  });
}

export async function listXpTransactions(userId, max = 50) {
  if (!db) throw new Error("Firebase is not configured.");
  const snapshot = await getDocs(
    query(collection(db, "xpTransactions"), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(max)),
  );
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listEnergyTransactions(userId, max = 50) {
  if (!db) throw new Error("Firebase is not configured.");
  const snapshot = await getDocs(
    query(
      collection(db, "energyTransactions"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(max),
    ),
  );
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listAllRecentTransactions(max = 100) {
  if (!db) throw new Error("Firebase is not configured.");
  const [xpSnap, energySnap] = await Promise.all([
    getDocs(query(collection(db, "xpTransactions"), orderBy("createdAt", "desc"), limit(max))),
    getDocs(query(collection(db, "energyTransactions"), orderBy("createdAt", "desc"), limit(max))),
  ]);
  return {
    xp: xpSnap.docs.map((item) => ({ id: item.id, ...item.data() })),
    energy: energySnap.docs.map((item) => ({ id: item.id, ...item.data() })),
  };
}
