import { NavLink } from "react-router-dom";
import { BarChart3, BookOpen, ClipboardList, GraduationCap, ShieldCheck, Users } from "lucide-react";

const tabs = [
  { to: "/admin", label: "Analytics", icon: BarChart3, end: true },
  { to: "/admin/classrooms", label: "Classrooms", icon: GraduationCap },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/mock-tests", label: "Mock Tests", icon: ClipboardList },
  { to: "/admin/questions", label: "Question Bank", icon: BookOpen },
];

export function AdminLayout({ children }) {
  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 to-blue-800 p-6 text-white">
          <div className="flex items-center gap-3">
            <ShieldCheck size={24} />
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-white/75">Administration</p>
              <h1 className="text-4xl font-black tracking-tight">Admin Panel</h1>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-white/85">
            Manage classrooms, students, mock tests, question bank, and platform analytics.
          </p>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${
                isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {children}
    </div>
  );
}
