import { useEffect, useState } from "react";
import { StatCard } from "../StatCard.jsx";
import { EmptyState } from "../EmptyState.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { fetchAnalyticsSnapshot } from "../../services/analyticsService.js";

export function AnalyticsDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    fetchAnalyticsSnapshot(user.uid)
      .then(setData)
      .catch((error) => setStatus(error.message))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  if (loading) {
    return <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-bold text-slate-500">Loading analytics...</p>;
  }

  if (!data?.available) {
    return (
      <EmptyState
        title="Analytics unavailable"
        copy={data?.message || status || "Connect Firebase and ensure your UID is listed in adminUsers."}
      />
    );
  }

  const { snapshot } = data;

  return (
    <div className="grid gap-6">
      {status ? <p className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{status}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={snapshot.totalUsers} helper="Registered profiles" tone="bg-white" />
        <StatCard label="Active users" value={snapshot.activeUsers} helper="Active in last 7 days" tone="bg-cyan-50" />
        <StatCard label="Classrooms" value={snapshot.totalClassrooms} helper="Active classrooms" tone="bg-blue-50" />
        <StatCard
          label="Mock completion"
          value={`${snapshot.mockTestCompletionRate}%`}
          helper={`${snapshot.totalSubmissions} submissions`}
          tone="bg-white"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total XP earned" value={snapshot.totalXpEarned.toLocaleString()} helper="Across all users" tone="bg-white" />
        <StatCard label="Total Energy earned" value={snapshot.totalEnergyEarned.toLocaleString()} helper="Across all users" tone="bg-cyan-50" />
        <StatCard
          label="Avg XP / user"
          value={snapshot.engagement.averageXpPerUser.toLocaleString()}
          helper="Engagement metric"
          tone="bg-blue-50"
        />
        <StatCard
          label="Submissions (7d)"
          value={snapshot.engagement.submissionsLast7Days}
          helper="Recent activity"
          tone="bg-white"
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Leaderboard insights</p>
        <div className="mt-4 grid gap-2">
          {snapshot.leaderboardTop.length ? (
            snapshot.leaderboardTop.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="font-black">
                  #{entry.rank} {entry.name}
                </span>
                <span className="font-bold text-blue-700">{entry.totalScore?.toLocaleString()} pts</span>
              </div>
            ))
          ) : (
            <EmptyState title="No leaderboard data" copy="Users will appear here once scores are recorded." />
          )}
        </div>
      </section>
    </div>
  );
}
