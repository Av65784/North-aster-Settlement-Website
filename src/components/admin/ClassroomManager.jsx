import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "../EmptyState.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  addStudentToClassroom,
  archiveClassroom,
  createClassroom,
  listClassroomMembers,
  listClassrooms,
  removeStudentFromClassroom,
  searchStudents,
} from "../../services/classroomService.js";

const emptyForm = { name: "", description: "", gradeLevel: "", subject: "" };

export function ClassroomManager() {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const items = await listClassrooms();
    setClassrooms(items);
    if (!selectedId && items.length) setSelectedId(items[0].id);
  }

  useEffect(() => {
    refresh().catch((error) => setStatus(error.message));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    listClassroomMembers(selectedId)
      .then(setMembers)
      .catch((error) => setStatus(error.message));
  }, [selectedId]);

  async function handleCreate(event) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const created = await createClassroom(user.uid, form);
      setForm(emptyForm);
      await refresh();
      setSelectedId(created.id);
      setStatus(`Classroom created. Code: ${created.classroomCode}`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive(classroomId) {
    setBusy(true);
    try {
      await archiveClassroom(user.uid, classroomId);
      await refresh();
      setStatus("Classroom archived.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSearchStudents() {
    setBusy(true);
    try {
      setStudentResults(await searchStudents(studentSearch));
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddStudent(studentId) {
    if (!selectedId) return;
    setBusy(true);
    try {
      await addStudentToClassroom(user.uid, selectedId, studentId);
      setMembers(await listClassroomMembers(selectedId));
      setStatus("Student added to classroom.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(memberId) {
    setBusy(true);
    try {
      await removeStudentFromClassroom(user.uid, memberId);
      setMembers(await listClassroomMembers(selectedId));
      setStatus("Student removed from classroom.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  const selected = classrooms.find((item) => item.id === selectedId);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {status ? <p className="lg:col-span-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-800">{status}</p> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Create classroom</p>
        <form onSubmit={handleCreate} className="mt-4 grid gap-3">
          <input
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Classroom name"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Description"
            className="min-h-20 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              value={form.gradeLevel}
              onChange={(event) => setForm({ ...form, gradeLevel: event.target.value })}
              placeholder="Grade / Level"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            <input
              required
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
              placeholder="Subject"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:bg-slate-300"
          >
            <Plus size={16} />
            Create classroom
          </button>
        </form>

        <div className="mt-6">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Classrooms</p>
          <div className="mt-2 grid gap-2">
            {classrooms.length ? (
              classrooms.map((classroom) => (
                <button
                  key={classroom.id}
                  type="button"
                  onClick={() => setSelectedId(classroom.id)}
                  className={`rounded-lg border px-3 py-2 text-left ${
                    selectedId === classroom.id ? "border-blue-300 bg-blue-50" : "border-slate-200"
                  }`}
                >
                  <span className="block font-black">{classroom.name}</span>
                  <span className="block text-xs text-slate-500">
                    {classroom.subject} • {classroom.gradeLevel} • Code {classroom.classroomCode}
                  </span>
                </button>
              ))
            ) : (
              <EmptyState title="No classrooms" copy="Create your first classroom to get started." />
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {selected ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Manage students</p>
                <h2 className="text-2xl font-black">{selected.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{selected.description}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleArchive(selected.id)}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600"
              >
                Archive
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              <input
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Search students..."
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
              <button
                type="button"
                disabled={busy}
                onClick={handleSearchStudents}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-black text-white"
              >
                Search
              </button>
            </div>

            {studentResults.length ? (
              <div className="mt-3 max-h-40 overflow-auto rounded-lg border border-slate-200">
                {studentResults.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleAddStudent(student.id)}
                    className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50"
                  >
                    <span>
                      <span className="block font-bold">{student.name}</span>
                      <span className="block text-xs text-slate-500">{student.email}</span>
                    </span>
                    <Plus size={16} className="text-blue-600" />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-5">
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Members ({members.length})</p>
              <div className="mt-2 grid gap-2">
                {members.length ? (
                  members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <span>
                        <span className="block font-bold">{member.displayName}</span>
                        <span className="block text-xs text-slate-500">{member.email}</span>
                      </span>
                      <button type="button" onClick={() => handleRemoveMember(member.id)} className="text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No students yet" copy="Search and add students to this classroom." />
                )}
              </div>
            </div>
          </>
        ) : (
          <EmptyState title="Select a classroom" copy="Choose a classroom to manage its students." />
        )}
      </section>
    </div>
  );
}
