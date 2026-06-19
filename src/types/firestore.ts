import type { Timestamp } from "firebase/firestore";

export type FirestoreDate = Timestamp | string | null;

export type UserRole = "user" | "admin";

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role?: UserRole;
  xp: number;
  energy: number;
  totalScore: number;
  completedTests: string[];
  completedUnits: string[];
  lastTestAttempt: FirestoreDate;
  moderationNotes?: ModerationNote[];
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface AdminUser {
  id: string;
  uid: string;
  email: string;
  name: string;
  active: boolean;
  grantedBy: string;
  grantedAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface Classroom {
  id?: string;
  name: string;
  description: string;
  gradeLevel: string;
  subject: string;
  classroomCode: string;
  createdBy: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
  archived: boolean;
  memberCount?: number;
}

export type ClassroomMemberRole = "student" | "teacher";

export interface ActivityEntry {
  id: string;
  type: string;
  summary: string;
  createdAt: FirestoreDate;
  metadata?: Record<string, unknown>;
}

export interface ClassroomMember {
  id?: string;
  classroomId: string;
  userId: string;
  role: ClassroomMemberRole;
  displayName: string;
  email: string;
  gradeLevel?: string;
  joinedAt: FirestoreDate;
  updatedAt: FirestoreDate;
  status: "active" | "removed";
  activityHistory: ActivityEntry[];
}

export type MockTestDifficulty = "Easy" | "Medium" | "Hard";

export interface MockTest {
  id?: string;
  title: string;
  description: string;
  subject: string;
  difficulty: MockTestDifficulty;
  durationMinutes: number;
  xpReward: number;
  energyReward: number;
  availableFrom: FirestoreDate;
  availableUntil: FirestoreDate;
  questionIds: string[];
  createdBy: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
  archived: boolean;
}

export type AssignmentTargetType = "classroom" | "student";

export interface MockAssignment {
  id?: string;
  mockTestId: string;
  mockTestTitle: string;
  targetType: AssignmentTargetType;
  targetIds: string[];
  releaseAt: FirestoreDate;
  createdBy: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
  status: "scheduled" | "released" | "closed";
}

export interface SubmissionAnswer {
  questionId: string;
  response: string;
  isCorrect?: boolean;
  points?: number;
}

export interface Submission {
  id?: string;
  mockTestId: string;
  assignmentId?: string;
  userId: string;
  userName: string;
  score: number;
  maxScore: number;
  answers: SubmissionAnswer[];
  submittedAt: FirestoreDate;
  status: "in_progress" | "submitted" | "graded";
}

export type QuestionType = "multiple_choice" | "short_answer" | "long_answer";

export interface QuestionBankItem {
  id?: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  difficulty: MockTestDifficulty;
  topics: string[];
  subject: string;
  unit?: string;
  createdBy: string;
  createdAt: FirestoreDate;
  updatedAt: FirestoreDate;
  archived: boolean;
}

export interface ProgressTransaction {
  id?: string;
  userId: string;
  userName: string;
  delta: number;
  reason: string;
  note?: string;
  adminId: string;
  adminName: string;
  balanceAfter: number;
  createdAt: FirestoreDate;
}

export interface ModerationNote {
  id: string;
  note: string;
  adminId: string;
  adminName: string;
  createdAt: FirestoreDate;
}

export interface Announcement {
  id?: string;
  title: string;
  body: string;
  targetClassroomIds: string[];
  createdBy: string;
  createdAt: FirestoreDate;
  publishedAt: FirestoreDate;
  updatedAt: FirestoreDate;
}

export interface AnalyticsSnapshot {
  totalUsers: number;
  activeUsers: number;
  totalClassrooms: number;
  totalXpEarned: number;
  totalEnergyEarned: number;
  mockTestCompletionRate: number;
  totalSubmissions: number;
  totalAssignments: number;
  leaderboardTop: Array<Pick<UserProfile, "name" | "totalScore" | "xp" | "energy"> & { id: string; rank: number }>;
  engagement: {
    averageXpPerUser: number;
    averageEnergyPerUser: number;
    submissionsLast7Days: number;
  };
}

export interface CreateClassroomInput {
  name: string;
  description: string;
  gradeLevel: string;
  subject: string;
}

export interface CreateMockTestInput {
  title: string;
  description: string;
  subject: string;
  difficulty: MockTestDifficulty;
  durationMinutes: number;
  xpReward: number;
  energyReward: number;
  availableFrom: Date | null;
  availableUntil: Date | null;
  questionIds?: string[];
}

export interface CreateQuestionInput {
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  difficulty: MockTestDifficulty;
  topics: string[];
  subject: string;
  unit?: string;
}

export interface AssignMockTestInput {
  mockTestId: string;
  targetType: AssignmentTargetType;
  targetIds: string[];
  releaseAt: Date | null;
}

export interface AdjustProgressInput {
  userId: string;
  delta: number;
  reason: string;
  note?: string;
}
