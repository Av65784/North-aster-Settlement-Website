import { FileUp, RefreshCw, Save, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { ForgeStructureEditor } from "../components/ForgeStructureEditor.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  generateForgeStructure,
  getForgeContext,
  regenerateForgeStructure,
  saveForgeStructure,
  subscribeForgeSubjects,
  uploadForgeFiles,
} from "../services/forgeService.js";

export function ForgePage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(null);
  const [pastedNotes, setPastedNotes] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeForgeSubjects(user.uid, setSubjects), [user.uid]);

  useEffect(() => {
    if (!selectedId && subjects.length) {
      setSelectedId(subjects[0].id);
    }
  }, [subjects, selectedId]);

  useEffect(() => {
    const selected = subjects.find((item) => item.id === selectedId);
    setDraft(selected ? structuredClone(selected) : null);
  }, [subjects, selectedId]);

  async function handleUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setBusy(true);
    setStatus("Uploading files...");
    setProgress(0);

    try {
      const { uploaded, combinedText } = await uploadForgeFiles(user.uid, files, setProgress);
      const sourceText = [pastedNotes.trim(), combinedText].filter(Boolean).join("\n\n---\n\n");
      if (!sourceText.trim()) throw new Error("No readable content found in uploaded files.");

      setStatus("Generating learning structure with Gemini...");
      const generated = await generateForgeStructure(
        user.uid,
        sourceText,
        uploaded.map((item) => item.id),
      );
      setSelectedId(generated.id);
      setPastedNotes("");
      setStatus("Learning path generated successfully.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function handleGenerateFromPaste() {
    if (!pastedNotes.trim()) {
      setStatus("Paste notes or upload files first.");
      return;
    }

    setBusy(true);
    setProgress(100);
    setStatus("Generating learning structure with Gemini...");

    try {
      const generated = await generateForgeStructure(user.uid, pastedNotes.trim(), []);
      setSelectedId(generated.id);
      setPastedNotes("");
      setStatus("Learning path generated successfully.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate() {
    if (!draft) return;

    setBusy(true);
    setStatus("Regenerating structure...");
    try {
      const context = await getForgeContext(user.uid);
      const sourceText = context.sourceText || pastedNotes.trim();
      if (!sourceText) throw new Error("No source material available to regenerate from.");

      const regenerated = await regenerateForgeStructure(user.uid, draft.id, sourceText);
      setSelectedId(regenerated.id);
      setStatus("Structure regenerated.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!draft) return;

    setBusy(true);
    setStatus("Saving changes...");
    try {
      const saved = await saveForgeStructure(user.uid, draft);
      setSelectedId(saved.id);
      setStatus("Changes saved.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-400 p-6 text-white">
          <div className="flex items-center gap-3">
            <Sparkles size={24} />
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-white/75">Forge</p>
              <h1 className="text-4xl font-black tracking-tight">Build your learning path</h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-white/85">
            Upload study materials and let Gemini generate an editable subject hierarchy with units, sub-units, and
            lessons.
          </p>
        </div>
      </section>

      {!user ? (
        <p className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm font-bold text-amber-900">
          Sign in to use AI-powered Forge generation.
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Upload</p>
          <h2 className="mt-1 text-2xl font-black">Study materials</h2>

          <label className="mt-4 grid cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-blue-400">
            <FileUp size={32} className="text-blue-600" />
            <strong className="mt-3">Upload notes or documents</strong>
            <span className="mt-1 text-sm text-slate-500">PDF, text, or images up to 20MB each</span>
            <input
              className="hidden"
              type="file"
              multiple
              accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.csv,.json"
              onChange={handleUpload}
              disabled={busy}
            />
          </label>

          <textarea
            value={pastedNotes}
            onChange={(event) => setPastedNotes(event.target.value)}
            className="mt-4 min-h-40 w-full resize-y rounded-lg border border-slate-200 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-400"
            placeholder="Or paste notes here..."
            disabled={busy}
          />

          <button
            type="button"
            disabled={busy}
            onClick={handleGenerateFromPaste}
            className="mt-3 w-full rounded-lg bg-slate-950 px-4 py-3 font-black text-white disabled:bg-slate-300"
          >
            Generate from pasted notes
          </button>

          {busy || status ? (
            <div className="mt-4 rounded-lg bg-slate-50 p-4">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-600">{status || "Working..."}</p>
            </div>
          ) : null}

          {subjects.length ? (
            <div className="mt-5">
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Your subjects</p>
              <div className="mt-2 grid gap-2">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setSelectedId(subject.id)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm font-bold ${
                      selectedId === subject.id
                        ? "border-blue-300 bg-blue-50 text-blue-800"
                        : "border-slate-200 text-slate-700"
                    }`}
                  >
                    {subject.title}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Structure</p>
              <h2 className="text-2xl font-black">Edit learning path</h2>
            </div>
            {draft ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRegenerate}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
                >
                  <RefreshCw size={16} />
                  Regenerate
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-black text-white disabled:bg-blue-300"
                >
                  <Save size={16} />
                  Save changes
                </button>
              </div>
            ) : null}
          </div>

          {draft ? (
            <ForgeStructureEditor tree={draft} onChange={setDraft} />
          ) : (
            <EmptyState
              title="No structure yet"
              copy="Upload notes or paste content to generate your first Forge learning path."
            />
          )}
        </section>
      </div>
    </div>
  );
}
