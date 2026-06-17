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
import { randomCode } from "../utils/codes.js";

/**
 * @typedef {import('../types/firestore.ts').Classroom} Classroom
 * @typedef {import('../types/firestore.ts').ClassroomMember} ClassroomMember
 * @typedef {import('../types/firestore.ts').CreateClassroomInput} CreateClassroomInput
 * @typedef {import('../types/firestore.ts').ActivityEntry} ActivityEntry
 */

function mapDoc(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

export async function createClassroom(adminUid, input) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");

  const payload = {
    name: input.name.trim(),
    description: input.description.trim(),
    gradeLevel: input.gradeLevel.trim(),
    subject: input.subject.trim(),
    classroomCode: randomCode(),
    createdBy: adminUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    archived: false,
    memberCount: 0,
  };

  const ref = await addDoc(collection(db, "classrooms"), payload);
  return { id: ref.id, ...payload };
}

export async function listClassrooms(includeArchived = false) {
  if (!db) throw new Error("Firebase is not configured.");
  const snapshot = await getDocs(query(collection(db, "classrooms"), orderBy("createdAt", "desc"), limit(200)));
  const classrooms = snapshot.docs.map(mapDoc);
  return includeArchived ? classrooms : classrooms.filter((item) => !item.archived);
}

export async function updateClassroom(adminUid, classroomId, patch) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");

  await updateDoc(doc(db, "classrooms", classroomId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDoc(doc(db, "classrooms", classroomId));
  return mapDoc(snapshot);
}

export async function archiveClassroom(adminUid, classroomId) {
  return updateClassroom(adminUid, classroomId, { archived: true });
}

export async function addStudentToClassroom(adminUid, classroomId, userId) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");

  const [classroomSnap, userSnap] = await Promise.all([
    getDoc(doc(db, "classrooms", classroomId)),
    getDoc(doc(db, "users", userId)),
  ]);

  if (!classroomSnap.exists()) throw new Error("Classroom not found.");
  if (!userSnap.exists()) throw new Error("Student not found.");

  const user = userSnap.data();
  const existing = await getDocs(
    query(
      collection(db, "classroomMembers"),
      where("classroomId", "==", classroomId),
      where("userId", "==", userId),
      limit(1),
    ),
  );

  if (!existing.empty) {
    const memberRef = existing.docs[0].ref;
    await updateDoc(memberRef, {
      status: "active",
      displayName: user.name || "Student",
      email: user.email || "",
      updatedAt: serverTimestamp(),
    });
    return { id: existing.docs[0].id, ...existing.docs[0].data(), status: "active" };
  }

  const activityEntry = {
    id: `activity-${Date.now()}`,
    type: "classroom_joined",
    summary: `Added to ${classroomSnap.data().name}`,
    createdAt: new Date().toISOString(),
  };

  const memberRef = await addDoc(collection(db, "classroomMembers"), {
    classroomId,
    userId,
    role: "student",
    displayName: user.name || "Student",
    email: user.email || "",
    gradeLevel: classroomSnap.data().gradeLevel || "",
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: "active",
    activityHistory: [activityEntry],
  });

  await updateDoc(doc(db, "classrooms", classroomId), {
    memberCount: Number(classroomSnap.data().memberCount || 0) + 1,
    updatedAt: serverTimestamp(),
  });

  return { id: memberRef.id, classroomId, userId, status: "active" };
}

export async function removeStudentFromClassroom(adminUid, memberId) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");

  const memberSnap = await getDoc(doc(db, "classroomMembers", memberId));
  if (!memberSnap.exists()) throw new Error("Classroom member not found.");

  const member = memberSnap.data();
  await updateDoc(memberSnap.ref, {
    status: "removed",
    updatedAt: serverTimestamp(),
    activityHistory: [
      {
        id: `activity-${Date.now()}`,
        type: "classroom_removed",
        summary: "Removed from classroom",
        createdAt: new Date().toISOString(),
      },
      ...(member.activityHistory || []),
    ].slice(0, 50),
  });

  const classroomSnap = await getDoc(doc(db, "classrooms", member.classroomId));
  if (classroomSnap.exists()) {
    await updateDoc(classroomSnap.ref, {
      memberCount: Math.max(0, Number(classroomSnap.data().memberCount || 1) - 1),
      updatedAt: serverTimestamp(),
    });
  }

  return { ok: true };
}

export async function listClassroomMembers(classroomId) {
  if (!db) throw new Error("Firebase is not configured.");
  const snapshot = await getDocs(
    query(collection(db, "classroomMembers"), where("classroomId", "==", classroomId), limit(200)),
  );
  return snapshot.docs.map(mapDoc).filter((item) => item.status === "active");
}

export async function searchStudents(searchTerm = "", max = 100) {
  if (!db) throw new Error("Firebase is not configured.");
  const snapshot = await getDocs(query(collection(db, "users"), limit(max)));
  const users = snapshot.docs.map(mapDoc);
  const term = searchTerm.trim().toLowerCase();
  if (!term) return users;
  return users.filter(
    (user) =>
      user.name?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.id?.toLowerCase().includes(term),
  );
}

export async function getStudentProfile(userId) {
  if (!db) throw new Error("Firebase is not configured.");
  const [userSnap, membershipsSnap, xpSnap, energySnap] = await Promise.all([
    getDoc(doc(db, "users", userId)),
    getDocs(query(collection(db, "classroomMembers"), where("userId", "==", userId), limit(50))),
    getDocs(query(collection(db, "xpTransactions"), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(20))),
    getDocs(query(collection(db, "energyTransactions"), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(20))),
  ]);

  if (!userSnap.exists()) throw new Error("Student not found.");

  return {
    profile: mapDoc(userSnap),
    memberships: membershipsSnap.docs.map(mapDoc),
    xpTransactions: xpSnap.docs.map(mapDoc),
    energyTransactions: energySnap.docs.map(mapDoc),
  };
}

export async function updateStudentInfo(adminUid, userId, patch) {
  await assertAdminAccess(adminUid);
  if (!db) throw new Error("Firebase is not configured.");

  const allowed = {};
  if (patch.name) allowed.name = patch.name.trim();
  if (Object.keys(allowed).length === 0) return getStudentProfile(userId);

  await updateDoc(doc(db, "users", userId), {
    ...allowed,
    updatedAt: serverTimestamp(),
  });

  return getStudentProfile(userId);
}

export async function appendStudentActivity(memberId, entry) {
  if (!db) throw new Error("Firebase is not configured.");
  const memberRef = doc(db, "classroomMembers", memberId);
  const memberSnap = await getDoc(memberRef);
  if (!memberSnap.exists()) throw new Error("Classroom member not found.");

  const history = [entry, ...(memberSnap.data().activityHistory || [])].slice(0, 50);
  await updateDoc(memberRef, { activityHistory: history, updatedAt: serverTimestamp() });
  return history;
}
