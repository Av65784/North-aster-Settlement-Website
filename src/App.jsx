import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { AppPage } from "./pages/AppPage.jsx";
import { AdminPage } from "./pages/AdminPage.jsx";
import { ForgePage } from "./pages/ForgePage.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { LeaderboardPage } from "./pages/LeaderboardPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-950">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-100 border-t-blue-600" />
    </main>
  );
}

function ProtectedRoute({ children }) {
  const { isFirebaseConfigured, loading, user } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isFirebaseConfigured) return <Navigate to="/login" replace />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

function AdminRoute({ children }) {
  const { isFirebaseConfigured, loading, user, isAdmin } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isFirebaseConfigured) return <Navigate to="/login" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/app" replace />;
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/forge"
        element={
          <ProtectedRoute>
            <ForgePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <LeaderboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
