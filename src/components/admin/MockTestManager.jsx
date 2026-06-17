import { Copy, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "../EmptyState.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { listClassrooms } from "../../services/classroomService.js";
import {
  archiveMockTest,
  assignMockTest,
  createMockTest,
  duplicateMockTest,
  getMockTestSubmissions,
  listMockAssignments,
  listMockTests,
  updateMockTest,
} from "../../services/mockTestAdminService.js";

const emptyTest = {
  title: "",
  description: "",
  subject: "",
  difficulty: "Medium",
  durationMinutes: 30,
  xpReward: 100,
  energyReward: 1,
  availableFrom: "",
  availableUntil: "",
};

export function MockTestManager() {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [form, setForm] = useState(emptyTest);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [assignForm, setAssignForm] = useState({
    targetType: "classroom",
    targetIds: "",
    releaseAt: "",
  });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [testItems, assignmentItems, classroomItems] = await Promise.all([
      listMockTests(),
      listMockAssignments(),
      listClassrooms(),
    ]);
    setTests(testItems);
    setAssignments(assignmentItems);
    setClassrooms(classroomItems);
    if (!selectedTestId && testItems.length) setSelectedTestId(testItems[0].id);
  }

  useEffect(() => {
    refresh().catch((error) => setStatus(error.message));
  }, []);

  useEffect(() => {
    if (!selectedTestId || !user?.uid) return;
    getMockTestSubmissions(user.uid, selectedTestId)
      .then(setSubmissions)
      .catch((error) => setStatus(error.message));
  }, [selectedTestId, user?.uid]);

  async function handleCreate(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await createMockTest(user.uid, {
        ...form,
        durationMinutes: Number(form.durationMinutes),
        xpReward: Number(form.xpReward),
        energyReward: Number(form.energyReward),
        availableFrom: form.availableFrom ? new Date(form.availableFrom) : null,
        availableUntil: form.availableUntil ? new Date(form.availableUntil) : null,
      });
      setForm(emptyTest);
      await refresh();
      setStatus("Mock test created.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAssign(event) {
    event.preventDefault();
    if (!selectedTestId) return;
    setBusy(true);
    try {
      await assignMockTest(user.uid, {
        mockTestId: selectedTestId,
        targetType: assignForm.targetType,
        targetIds: assignForm.targetIds.split(",").map((item) => item.trim()).filter(Boolean),
        releaseAt: assignForm.releaseAt ? new Date(assignForm.releaseAt) : null,
      });
      setAssignments(await listMockAssignments());
      setStatus("Mock test assigned.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate(testId) {
    setBusy(true);
    try {
      await duplicateMockTest(user.uid, testId);
      await refresh();
      setStatus("Mock test duplicated.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive(testId) {
    setBusy(true);
    try {
      await archiveMockTest(user.uid, testId);
      await refresh();
      setStatus("Mock test archived.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  const selectedTest = tests.find((item) => item.id === selectedTestId);

  return (
    <div className="grid gap-6">
      {status ? <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-800">{status}</p> : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Create mock test</p>
          <form onSubmit={handleCreate} className="mt-4 grid gap-3">
            <input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Title" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Description" className="min-h-20 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Subject" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input type="number" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} placeholder="Duration (min)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input type="number" value={form.xpReward} onChange={(event) => setForm({ ...form, xpReward: event.target.value })} placeholder="XP reward" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input type="number" value={form.energyReward} onChange={(event) => setForm({ ...form, energyReward: event.target.value })} placeholder="Energy reward" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input type="datetime-local" value={form.availableFrom} onChange={(event) => setForm({ ...form, availableFrom: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input type="datetime-local" value={form.availableUntil} onChange={(event) => setForm({ ...form, availableUntil: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white">
              <Plus size={16} />
              Create test
            </button>
          </form>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Assign mock test</p>
          {selectedTest ? (
            <form onSubmit={handleAssign} className="mt-4 grid gap-3">
              <p className="text-sm font-bold">{selectedTest.title}</p>
              <select value={assignForm.targetType} onChange={(event) => setAssignForm({ ...assignForm, targetType: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="classroom">Classroom</option>
                <option value="student">Individual students</option>
              </select>
              <input
                value={assignForm.targetIds}
                onChange={(event) => setAssignForm({ ...assignForm, targetIds: event.target.value })}
                placeholder={assignForm.targetType === "classroom" ? `Classroom IDs (${classrooms.map((c) => c.id).slice(0, 2).join(", ")}...)` : "Student UIDs comma-separated"}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input type="datetime-local" value={assignForm.releaseAt} onChange={(event) => setAssignForm({ ...assignForm, releaseAt: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-black text-white">
                Assign test
              </button>
            </form>
          ) : (
            <EmptyState title="No test selected" copy="Create or select a mock test first." />
          )}
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Manage tests</p>
          <div className="mt-3 grid gap-2">
            {tests.length ? (
              tests.map((test) => (
                <div key={test.id} className={`rounded-lg border p-3 ${selectedTestId === test.id ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}>
                  <button type="button" onClick={() => setSelectedTestId(test.id)} className="w-full text-left">
                    <span className="block font-black">{test.title}</span>
                    <span className="block text-xs text-slate-500">{test.subject} • {test.difficulty} • +{test.xpReward} XP • +{test.energyReward} Energy</span>
                  </button>
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={busy} onClick={() => handleDuplicate(test.id)} className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs font-bold">
                      <Copy size={12} /> Duplicate
                    </button>
                    <button type="button" disabled={busy} onClick={() => handleArchive(test.id)} className="rounded border border-red-200 px-2 py-1 text-xs font-bold text-red-600">
                      Archive
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No mock tests" copy="Create your first admin-managed mock test." />
            )}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Submissions & assignments</p>
          <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200">
            {submissions.length ? (
              submissions.map((item) => (
                <div key={item.id} className="border-b border-slate-100 px-3 py-2 text-sm last:border-b-0">
                  <span className="font-bold">{item.userName || item.userId}</span> — {item.score}/{item.maxScore || 100}
                </div>
              ))
            ) : (
              <EmptyState title="No submissions" copy="Submissions will appear once students complete assigned tests." />
            )}
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Recent assignments</p>
            <div className="mt-2 grid gap-2">
              {assignments.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
                  {item.mockTestTitle} → {item.targetType} ({item.targetIds?.length || 0}) • {item.status}
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
