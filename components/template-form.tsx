"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TaskEditor } from "@/components/editor/task-editor";
import type { EditorTask } from "@/components/editor/types";
import { validateTasksDetailed, type TemplateInput } from "@/lib/template-payload";

// Shared by the clinic (doctor) and the admin panel; each passes its own server actions.
export function TemplateForm({
  templateId,
  initial,
  saveAction,
  deleteAction,
  basePath,
}: {
  templateId: string | null;
  initial: { name: string; procedure: string; description: string; tasks: EditorTask[] };
  saveAction: (input: TemplateInput) => Promise<{ error?: string; id?: string }>;
  deleteAction: (id: string) => Promise<{ error?: string }>;
  basePath: string; // e.g. "/clinic/templates"
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [procedure, setProcedure] = useState(initial.procedure);
  const [description, setDescription] = useState(initial.description);
  const [tasks, setTasks] = useState(initial.tasks);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [focusTask, setFocusTask] = useState<{ id: string; nonce: number } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  // Warn before leaving with unsaved edits (closing the tab, not in-app navigation).
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function markDirty() {
    setSaved(false);
    setDirty(true);
  }

  function save() {
    setError(null);
    setSaved(false);

    if (!name.trim()) {
      setError("יש לתת שם לתבנית");
      nameRef.current?.focus();
      return;
    }
    const invalid = validateTasksDetailed(tasks);
    if (invalid) {
      setError(invalid.error);
      if (invalid.taskId) setFocusTask({ id: invalid.taskId, nonce: Date.now() });
      return;
    }

    start(async () => {
      const res = await saveAction({ id: templateId, name, procedure, description, tasks });
      if (res.error) return setError(res.error);
      setDirty(false);
      if (!templateId && res.id) router.replace(`${basePath}/${res.id}`);
      else { setSaved(true); router.refresh(); }
    });
  }

  function remove() {
    if (!templateId || !confirm("למחוק את התבנית? מטופלים קיימים לא יושפעו.")) return;
    start(async () => {
      const res = await deleteAction(templateId);
      if (res.error) setError(res.error);
      else router.replace(basePath);
    });
  }

  return (
    <div className="mt-6 space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="lbl" htmlFor="name">שם התבנית</label>
          <input
            id="name"
            ref={nameRef}
            autoComplete="off"
            required
            aria-invalid={!!error && !name.trim()}
            className="field"
            value={name}
            onChange={(e) => { setName(e.target.value); markDirty(); }}
            placeholder="למשל: החלפת ברך – פרוטוקול ד״ר כהן"
          />
        </div>
        <div>
          <label className="lbl" htmlFor="procedure">פרוצדורה</label>
          <input id="procedure" autoComplete="off" className="field" value={procedure} onChange={(e) => { setProcedure(e.target.value); markDirty(); }} />
        </div>
        <div className="sm:col-span-2">
          <label className="lbl" htmlFor="desc">תיאור</label>
          <input id="desc" autoComplete="off" className="field" value={description} onChange={(e) => { setDescription(e.target.value); markDirty(); }} />
        </div>
      </div>

      <TaskEditor tasks={tasks} onChange={(t) => { setTasks(t); markDirty(); }} focusTask={focusTask} />

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t border-line bg-surface/95 px-5 py-4 backdrop-blur">
        <button className="btn btn-primary" onClick={save} disabled={pending} aria-busy={pending}>{pending ? "שומר…" : "שמירת תבנית"}</button>
        {templateId && <button className="btn btn-danger btn-sm" onClick={remove} disabled={pending}>מחיקה</button>}
        <div aria-live="polite" className="basis-full sm:basis-auto">
          {saved && <span role="status" className="text-sm text-ok">נשמר</span>}
          {error && <span role="alert" className="text-sm text-bad">{error}</span>}
        </div>
      </div>
    </div>
  );
}
