import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../config/firebase.js";
import { assertAdminAccess } from "./adminAuthService.js";

/**
 * @typedef {import('../types/firestore.ts').AnalyticsSnapshot} AnalyticsSnapshot
 */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value === "string") return Date.parse(value);
  return Number(value) || 0;
}

export async function fetchAnalyticsSnapshot(adminUid) {
  await assertAdminAccess(adminUid);
  if (!isFirebaseConfigured || !db) {
    return {
      available: false,
      message: "Firebase is not configured.",
    };
  }

  const [
    usersSnap,
    classroomsSnap,
    submissionsSnap,
    assignmentsSnap,
    xpSnap,
    energySnap,
    leaderboardSnap,
  ] = await Promise.all([
    getDocs(query(collection(db, "users"), limit(500))),
    getDocs(query(collection(db, "classrooms"), where("archived", "==", false), limit(500))),
    getDocs(query(collection(db, "submissions"), limit(500))),
    getDocs(query(collection(db, "mockAssignments"), limit(500))),
    getDocs(query(collection(db, "xpTransactions"), limit(500))),
    getDocs(query(collection(db, "energyTransactions"), limit(500))),
    getDocs(query(collection(db, "users"), orderBy("totalScore", "desc"), limit(10))),
  ]);

  const users = usersSnap.docs.map((item) => ({ id: item.id, ...item.data() }));
  const now = Date.now();
  const activeUsers = users.filter((user) => now - toMillis(user.updatedAt) <= SEVEN_DAYS_MS).length;
  const totalXpEarned = users.reduce((sum, user) => sum + Number(user.xp || 0), 0);
  const totalEnergyEarned = users.reduce((sum, user) => sum + Number(user.energy || 0), 0);

  const submissions = submissionsSnap.docs.map((item) => item.data());
  const submittedCount = submissions.filter((item) => item.status === "submitted" || item.status === "graded").length;
  const assignmentCount = assignmentsSnap.size;
  const mockTestCompletionRate =
    assignmentCount > 0 ? Math.round((submittedCount / assignmentCount) * 100) : 0;

  const submissionsLast7Days = submissions.filter(
    (item) => now - toMillis(item.submittedAt) <= SEVEN_DAYS_MS,
  ).length;

  /** @type {AnalyticsSnapshot} */
  const snapshot = {
    totalUsers: users.length,
    activeUsers,
    totalClassrooms: classroomsSnap.size,
    totalXpEarned,
    totalEnergyEarned,
    mockTestCompletionRate,
    totalSubmissions: submissions.length,
    totalAssignments: assignmentCount,
    leaderboardTop: leaderboardSnap.docs.map((item, index) => ({
      id: item.id,
      rank: index + 1,
      name: item.data().name || "Unknown",
      totalScore: item.data().totalScore || 0,
      xp: item.data().xp || 0,
      energy: item.data().energy || 0,
    })),
    engagement: {
      averageXpPerUser: users.length ? Math.round(totalXpEarned / users.length) : 0,
      averageEnergyPerUser: users.length ? Math.round(totalEnergyEarned / users.length) : 0,
      submissionsLast7Days,
    },
  };

  return { available: true, snapshot, transactionCounts: { xp: xpSnap.size, energy: energySnap.size } };
}
