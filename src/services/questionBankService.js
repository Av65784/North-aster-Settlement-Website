import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase.js";
import { assertAdminAccess } from "./adminAuthService.js";

/**
 * @typedef {import('../types/firestore.ts').QuestionBankItem} QuestionBankItem
 * @typedef {import('../types/firestore.ts').CreateQuestionInput} CreateQuestionInput
 */

function mapDoc(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

export async function createQuestion(adminUid, input) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");

  const payload = {
    type: input.type,
    prompt: input.prompt.trim(),
    options: input.options || [],
    correctAnswer: input.correctAnswer || "",
    difficulty: input.difficulty,
    topics: input.topics || [],
    subject: input.subject.trim(),
    unit: input.unit?.trim() || "",
    createdBy: adminUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    archived: false,
  };

  const ref = await addDoc(collection(db, "questionBank"), payload);
  return { id: ref.id, ...payload };
}

export async function listQuestions(filters = {}) {
  if (!db) throw new Error("Firebase is not configured.");

  let q = query(collection(db, "questionBank"), orderBy("updatedAt", "desc"), limit(300));
  if (filters.subject) {
    q = query(
      collection(db, "questionBank"),
      where("subject", "==", filters.subject),
      orderBy("updatedAt", "desc"),
      limit(300),
    );
  }

  const snapshot = await getDocs(q);
  const items = snapshot.docs.map(mapDoc);
  return filters.includeArchived ? items : items.filter((item) => !item.archived);
}

export async function updateQuestion(adminUid, questionId, patch) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");

  await updateDoc(doc(db, "questionBank", questionId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
  return mapDoc(await getDoc(doc(db, "questionBank", questionId)));
}

export async function deleteQuestion(adminUid, questionId) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");
  await deleteDoc(doc(db, "questionBank", questionId));
  return { ok: true };
}

export async function archiveQuestion(adminUid, questionId) {
  return updateQuestion(adminUid, questionId, { archived: true });
}

export async function importQuestions(adminUid, questions) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");
  if (!Array.isArray(questions) || !questions.length) throw new Error("No questions to import.");

  const batch = writeBatch(db);
  const created = [];

  questions.slice(0, 100).forEach((input) => {
    const ref = doc(collection(db, "questionBank"));
    batch.set(ref, {
      type: input.type,
      prompt: String(input.prompt || "").trim(),
      options: input.options || [],
      correctAnswer: input.correctAnswer || "",
      difficulty: input.difficulty || "Medium",
      topics: input.topics || [],
      subject: String(input.subject || "General").trim(),
      unit: input.unit?.trim() || "",
      createdBy: adminUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      archived: false,
    });
    created.push(ref.id);
  });

  await batch.commit();
  return { imported: created.length, ids: created };
}

export async function listSubjectsFromQuestionBank() {
  const questions = await listQuestions({ includeArchived: false });
  return [...new Set(questions.map((item) => item.subject).filter(Boolean))].sort();
}

export async function listUnitsForSubject(subject) {
  const questions = await listQuestions({ subject, includeArchived: false });
  return [...new Set(questions.map((item) => item.unit).filter(Boolean))].sort();
}
