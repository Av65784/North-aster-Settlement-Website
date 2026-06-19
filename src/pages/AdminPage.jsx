import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "../components/admin/AdminLayout.jsx";
import { AnalyticsDashboard } from "../components/admin/AnalyticsDashboard.jsx";
import { ClassroomManager } from "../components/admin/ClassroomManager.jsx";
import { MockTestManager } from "../components/admin/MockTestManager.jsx";
import { QuestionBankManager } from "../components/admin/QuestionBankManager.jsx";
import { StudentManager } from "../components/admin/StudentManager.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export function AdminPage() {
  const { isAdmin, isFirebaseConfigured } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/app" replace />;
  }

  return (
    <AdminLayout>
      {!isFirebaseConfigured ? (
        <p className="rounded-lg border border-cyan-100 bg-cyan-50 p-3 text-sm font-bold text-cyan-900">
          Firebase is required for admin actions. Add your UID to the adminUsers collection in Firestore to enable access.
        </p>
      ) : null}

      <Routes>
        <Route index element={<AnalyticsDashboard />} />
        <Route path="classrooms" element={<ClassroomManager />} />
        <Route path="students" element={<StudentManager />} />
        <Route path="mock-tests" element={<MockTestManager />} />
        <Route path="questions" element={<QuestionBankManager />} />
      </Routes>
    </AdminLayout>
  );
}
