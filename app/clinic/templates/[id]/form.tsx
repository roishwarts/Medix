"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TaskEditor } from "@/components/editor/task-editor";
import type { EditorTask } from "@/components/editor/types";
import { deleteTemplate, saveTemplate } from "../actions";

export function TemplateForm({
  templateId,
  initial,
}: {
  templateId: string | null;
  initial: { name: string; procedure: string; description: string; tasks: EditorTask[] };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [procedure, setProcedure] = useState(initial.procedure);
  const [description, setDescription] = useState(initial.description);
  const [tasks, setTasks] = useState(initial.tasks);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await saveTemplate({ id: templateId, name, procedure, description, tasks });
      if (res.error) return setError(res.error);
      if (!templateId && res.id) router.replace(`/clinic/templates/${res.id}`);
      else { setSaved(true); router.refresh(); }
    });
  }

  function remove() {
    if (!templateId || !confirm("למחוק את התבנית? מטופלים קיימים לא יושפעו.")) return;
    start(async () => {
      const res = await deleteTemplate(templateId);
      if (res.error) setError(res.error);
      else router.replace("/clinic/templates");
    });
  }

  return (
    <div className="mt-6 space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="lbl" htmlFor="name">שם התבנית</label>
          <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: החלפת ברך – פרוטוקול ד״ר כהן" />
        </div>
        <div>
          <label className="lbl" htmlFor="procedure">פרוצדורה</label>
          <input id="procedure" className="field" value={procedure} onChange={(e) => setProcedure(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="lbl" htmlFor="desc">תיאור</label>
          <input id="desc" className="field" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <TaskEditor tasks={tasks} onChange={(t) => { setTasks(t); setSaved(false); }} />

      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-5 py-4 backdrop-blur">
        <button className="btn btn-primary" onClick={save} disabled={pending}>{pending ? "שומר…" : "שמירת תבנית"}</button>
        {templateId && <button className="btn btn-danger btn-sm" onClick={remove} disabled={pending}>מחיקה</button>}
        {saved && <span className="text-sm text-ok">נשמר</span>}
        {error && <span role="alert" className="text-sm text-bad">{error}</span>}
      </div>
    </div>
  );
}
