import { Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "../EmptyState.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  archiveQuestion,
  createQuestion,
  deleteQuestion,
  importQuestions,
  listQuestions,
  listSubjectsFromQuestionBank,
  updateQuestion,
} from "../../services/questionBankService.js";

const emptyQuestion = {
  type: "multiple_choice",
  prompt: "",
  options: ["", "", "", ""],
  correctAnswer: "",
  difficulty: "Medium",
  topics: "",
  subject: "",
  unit: "",
};

export function QuestionBankManager() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filterSubject, setFilterSubject] = useState("");
  const [form, setForm] = useState(emptyQuestion);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [items, subjectList] = await Promise.all([
      listQuestions({ subject: filterSubject || undefined }),
      listSubjectsFromQuestionBank(),
    ]);
    setQuestions(items);
    setSubjects(subjectList);
  }

  useEffect(() => {
    refresh().catch((error) => setStatus(error.message));
  }, [filterSubject]);

  async function handleCreate(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await createQuestion(user.uid, {
        ...form,
        options: form.type === "multiple_choice" ? form.options.filter(Boolean) : [],
        topics: form.topics.split(",").map((item) => item.trim()).filter(Boolean),
      });
      setForm(emptyQuestion);
      await refresh();
      setStatus("Question created.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = await importQuestions(user.uid, parsed);
      await refresh();
      setStatus(`Imported ${result.imported} questions.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function handleDelete(questionId) {
    setBusy(true);
    try {
      await deleteQuestion(user.uid, questionId);
      await refresh();
      setStatus("Question deleted.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive(questionId) {
    setBusy(true);
    try {
      await archiveQuestion(user.uid, questionId);
      await refresh();
      setStatus("Question archived.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {status ? <p className="lg:col-span-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-800">{status}</p> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Create question</p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">
            <Upload size={14} />
            Import JSON
            <input type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
          </label>
        </div>

        <form onSubmit={handleCreate} className="mt-4 grid gap-3">
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="multiple_choice">Multiple choice</option>
            <option value="short_answer">Short answer</option>
            <option value="long_answer">Long answer</option>
          </select>
          <textarea required value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} placeholder="Question prompt" className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          {form.type === "multiple_choice" ? (
            <div className="grid gap-2">
              {form.options.map((option, index) => (
                <input
                  key={index}
                  value={option}
                  onChange={(event) => {
                    const next = [...form.options];
                    next[index] = event.target.value;
                    setForm({ ...form, options: next });
                  }}
                  placeholder={`Option ${index + 1}`}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              ))}
              <input value={form.correctAnswer} onChange={(event) => setForm({ ...form, correctAnswer: event.target.value })} placeholder="Correct answer (must match an option)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
          ) : (
            <input value={form.correctAnswer} onChange={(event) => setForm({ ...form, correctAnswer: event.target.value })} placeholder="Reference answer / rubric" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <input required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Subject" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="Unit (optional)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <input value={form.topics} onChange={(event) => setForm({ ...form, topics: event.target.value })} placeholder="Topics (comma-separated)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
          <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white">
            <Plus size={16} />
            Add question
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Question bank</p>
          <select value={filterSubject} onChange={(event) => setFilterSubject(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 max-h-[620px] overflow-auto rounded-lg border border-slate-200">
          {questions.length ? (
            questions.map((question) => (
              <div key={question.id} className="border-b border-slate-100 px-3 py-3 last:border-b-0">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{question.type.replace("_", " ")} • {question.difficulty}</p>
                <p className="mt-1 text-sm font-bold">{question.prompt}</p>
                <p className="mt-1 text-xs text-slate-500">{question.subject}{question.unit ? ` • ${question.unit}` : ""} • {(question.topics || []).join(", ")}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" disabled={busy} onClick={() => handleArchive(question.id)} className="rounded border border-slate-200 px-2 py-1 text-xs font-bold">Archive</button>
                  <button type="button" disabled={busy} onClick={() => handleDelete(question.id)} className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs font-bold text-red-600">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="No questions yet" copy="Create or import questions to build your question bank." />
          )}
        </div>
      </section>
    </div>
  );
}
