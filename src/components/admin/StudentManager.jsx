import { useEffect, useState } from "react";
import { EmptyState } from "../EmptyState.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getStudentProfile, searchStudents, updateStudentInfo } from "../../services/classroomService.js";
import {
  addModerationNote,
  adjustUserEnergyWithHistory,
  adjustUserXpWithHistory,
} from "../../services/progressService.js";
import { calculateTotalScore } from "../../services/userService.js";

export function StudentManager() {
  const { user, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [xpDelta, setXpDelta] = useState(100);
  const [energyDelta, setEnergyDelta] = useState(1);
  const [reason, setReason] = useState("Admin adjustment");
  const [note, setNote] = useState("");
  const [editName, setEditName] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function runSearch() {
    setBusy(true);
    setStatus("");
    try {
      const results = await searchStudents(searchTerm);
      setStudents(results);
      setStatus(`Found ${results.length} students.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadStudent(userId) {
    setSelectedId(userId);
    setBusy(true);
    try {
      const data = await getStudentProfile(userId);
      setDetail(data);
      setEditName(data.profile.name || "");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    runSearch();
  }, []);

  async function applyXp(sign) {
    if (!selectedId) return;
    setBusy(true);
    try {
      await adjustUserXpWithHistory(user.uid, profile?.name || "Admin", {
        userId: selectedId,
        delta: sign * Number(xpDelta || 0),
        reason,
        note,
      });
      await loadStudent(selectedId);
      setStatus("XP updated with transaction history.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function applyEnergy(sign) {
    if (!selectedId) return;
    setBusy(true);
    try {
      await adjustUserEnergyWithHistory(user.uid, profile?.name || "Admin", {
        userId: selectedId,
        delta: sign * Number(energyDelta || 0),
        reason,
        note,
      });
      await loadStudent(selectedId);
      setStatus("Energy updated with transaction history.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveStudentInfo() {
    if (!selectedId) return;
    setBusy(true);
    try {
      const data = await updateStudentInfo(user.uid, selectedId, { name: editName });
      setDetail(data);
      setStatus("Student profile updated.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveModerationNote() {
    if (!selectedId || !note.trim()) return;
    setBusy(true);
    try {
      await addModerationNote(user.uid, profile?.name || "Admin", selectedId, note);
      await loadStudent(selectedId);
      setNote("");
      setStatus("Moderation note added.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      {status ? <p className="lg:col-span-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-800">{status}</p> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Search students</p>
        <div className="mt-3 flex gap-2">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Name, email, or UID"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
          <button type="button" disabled={busy} onClick={runSearch} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white">
            Search
          </button>
        </div>

        <div className="mt-4 max-h-[520px] overflow-auto rounded-lg border border-slate-200">
          {students.length ? (
            students.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => loadStudent(student.id)}
                className={`flex w-full items-center justify-between border-b border-slate-100 px-3 py-3 text-left last:border-b-0 ${
                  selectedId === student.id ? "bg-blue-50" : "bg-white"
                }`}
              >
                <span>
                  <span className="block font-black">{student.name}</span>
                  <span className="block text-xs text-slate-500">{student.email}</span>
                </span>
                <span className="text-xs font-bold text-slate-600">{student.totalScore || calculateTotalScore(student.xp, student.energy)}</span>
              </button>
            ))
          ) : (
            <EmptyState title="No students found" copy="Search for registered users." />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {detail ? (
          <div className="grid gap-5">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Student profile</p>
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-black outline-none focus:border-blue-400"
              />
              <p className="mt-1 text-sm text-slate-500">{detail.profile.email}</p>
              <button type="button" disabled={busy} onClick={saveStudentInfo} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-black text-white">
                Save profile
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-bold text-slate-500">XP</p>
                <p className="text-xl font-black">{detail.profile.xp || 0}</p>
              </div>
              <div className="rounded-lg bg-cyan-50 p-3 text-sm">
                <p className="font-bold text-slate-500">Energy</p>
                <p className="text-xl font-black">{detail.profile.energy || 0}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 text-sm">
                <p className="font-bold text-slate-500">Total score</p>
                <p className="text-xl font-black">
                  {detail.profile.totalScore || calculateTotalScore(detail.profile.xp, detail.profile.energy)}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-black">Progress adjustments</p>
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason"
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Moderation / transaction note"
                className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <input type="number" value={xpDelta} onChange={(event) => setXpDelta(event.target.value)} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <button type="button" disabled={busy} onClick={() => applyXp(1)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white">+ XP</button>
                  <button type="button" disabled={busy} onClick={() => applyXp(-1)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">- XP</button>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={energyDelta} onChange={(event) => setEnergyDelta(event.target.value)} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <button type="button" disabled={busy} onClick={() => applyEnergy(1)} className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-black text-white">+ Energy</button>
                  <button type="button" disabled={busy} onClick={() => applyEnergy(-1)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">- Energy</button>
                </div>
              </div>
              <button type="button" disabled={busy} onClick={saveModerationNote} className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold">
                Add moderation note
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500">XP transactions</p>
                <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-200">
                  {(detail.xpTransactions || []).map((tx) => (
                    <div key={tx.id} className="border-b border-slate-100 px-3 py-2 text-xs last:border-b-0">
                      <span className="font-bold">{tx.delta > 0 ? "+" : ""}{tx.delta} XP</span> — {tx.reason}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Energy transactions</p>
                <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-200">
                  {(detail.energyTransactions || []).map((tx) => (
                    <div key={tx.id} className="border-b border-slate-100 px-3 py-2 text-xs last:border-b-0">
                      <span className="font-bold">{tx.delta > 0 ? "+" : ""}{tx.delta} Energy</span> — {tx.reason}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Activity history</p>
              <div className="mt-2 grid gap-2">
                {(detail.memberships || []).flatMap((membership) => membership.activityHistory || []).slice(0, 10).map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <span className="font-bold">{entry.type}</span> — {entry.summary}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title="Select a student" copy="Search and select a student to manage progress and view history." />
        )}
      </section>
    </div>
  );
}
