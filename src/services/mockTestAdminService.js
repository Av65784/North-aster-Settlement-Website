import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase.js";
import { assertAdminAccess } from "./adminAuthService.js";

/**
 * @typedef {import('../types/firestore.ts').MockTest} MockTest
 * @typedef {import('../types/firestore.ts').MockAssignment} MockAssignment
 * @typedef {import('../types/firestore.ts').Submission} Submission
 * @typedef {import('../types/firestore.ts').CreateMockTestInput} CreateMockTestInput
 * @typedef {import('../types/firestore.ts').AssignMockTestInput} AssignMockTestInput
 */

function mapDoc(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

function toTimestampValue(value) {
  if (!value) return null;
  return value;
}

export async function createMockTest(adminUid, input) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");

  const payload = {
    title: input.title.trim(),
    description: input.description.trim(),
    subject: input.subject.trim(),
    difficulty: input.difficulty,
    durationMinutes: Number(input.durationMinutes || 0),
    xpReward: Number(input.xpReward || 0),
    energyReward: Number(input.energyReward || 0),
    availableFrom: input.availableFrom ? input.availableFrom.toISOString() : null,
    availableUntil: input.availableUntil ? input.availableUntil.toISOString() : null,
    questionIds: input.questionIds || [],
    createdBy: adminUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    archived: false,
  };

  const ref = await addDoc(collection(db, "mockTests"), payload);
  return { id: ref.id, ...payload };
}

export async function listMockTests(includeArchived = false) {
  if (!db) throw new Error("Firebase is not configured.");
  const snapshot = await getDocs(query(collection(db, "mockTests"), orderBy("createdAt", "desc"), limit(200)));
  const tests = snapshot.docs.map(mapDoc);
  return includeArchived ? tests : tests.filter((item) => !item.archived);
}

export async function updateMockTest(adminUid, testId, patch) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");

  const nextPatch = { ...patch, updatedAt: serverTimestamp() };
  if (patch.availableFrom instanceof Date) nextPatch.availableFrom = patch.availableFrom.toISOString();
  if (patch.availableUntil instanceof Date) nextPatch.availableUntil = patch.availableUntil.toISOString();

  await updateDoc(doc(db, "mockTests", testId), nextPatch);
  return mapDoc(await getDoc(doc(db, "mockTests", testId)));
}

export async function archiveMockTest(adminUid, testId) {
  return updateMockTest(adminUid, testId, { archived: true });
}

export async function duplicateMockTest(adminUid, testId) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");

  const source = await getDoc(doc(db, "mockTests", testId));
  if (!source.exists()) throw new Error("Mock test not found.");
  const data = source.data();

  return createMockTest(adminUid, {
    title: `${data.title} (Copy)`,
    description: data.description,
    subject: data.subject,
    difficulty: data.difficulty,
    durationMinutes: data.durationMinutes,
    xpReward: data.xpReward,
    energyReward: data.energyReward,
    availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
    availableUntil: data.availableUntil ? new Date(data.availableUntil) : null,
    questionIds: data.questionIds || [],
  });
}

export async function assignMockTest(adminUid, input) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");

  const testSnap = await getDoc(doc(db, "mockTests", input.mockTestId));
  if (!testSnap.exists()) throw new Error("Mock test not found.");

  const releaseAt = input.releaseAt ? input.releaseAt.toISOString() : new Date().toISOString();
  const status = input.releaseAt && input.releaseAt.getTime() > Date.now() ? "scheduled" : "released";

  const ref = await addDoc(collection(db, "mockAssignments"), {
    mockTestId: input.mockTestId,
    mockTestTitle: testSnap.data().title,
    targetType: input.targetType,
    targetIds: input.targetIds,
    releaseAt,
    createdBy: adminUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status,
  });

  return { id: ref.id, mockTestId: input.mockTestId, status };
}

export async function listMockAssignments(max = 200) {
  if (!db) throw new Error("Firebase is not configured.");
  const snapshot = await getDocs(query(collection(db, "mockAssignments"), orderBy("createdAt", "desc"), limit(max)));
  return snapshot.docs.map(mapDoc);
}

export async function listSubmissions(filters = {}) {
  if (!db) throw new Error("Firebase is not configured.");

  let q = query(collection(db, "submissions"), orderBy("submittedAt", "desc"), limit(200));
  if (filters.mockTestId) {
    q = query(
      collection(db, "submissions"),
      where("mockTestId", "==", filters.mockTestId),
      orderBy("submittedAt", "desc"),
      limit(200),
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapDoc);
}

export async function getMockTestSubmissions(adminUid, testId) {
  await assertAdminAccess(adminUid);
  return listSubmissions({ mockTestId: testId });
}
