"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskEditor } from "@/components/editor/task-editor";
import type { EditorTask } from "@/components/editor/types";
import { saveJourneyTasks } from "../../../templates/actions";

export function JourneyEditForm({
  journeyId,
  surgeryDate,
  initialTasks,
}: {
  journeyId: string;
  surgeryDate: string;
  initialTasks: EditorTask[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(surgeryDate);
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const res = await saveJourneyTasks({ journeyId, surgeryDate: date, tasks });
      if (res.error) return setError(res.error);
      router.push(`/clinic/patients/${journeyId}`);
      router.refresh();
    });
  }

  return (
    <div className="mt-8 space-y-8">
      <div className="max-w-xs">
        <label className="lbl" htmlFor="date">תאריך ניתוח</label>
        <input
          id="date"
          type="date"
          required
          className="field"
          value={date}
          aria-describedby="date-hint"
          onChange={(e) => setDate(e.target.value)}
        />
        <p id="date-hint" className="mt-1.5 text-sm text-muted">מועדי המשימות מחושבים לפי תאריך זה.</p>
      </div>
      {tasks.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">
          עדיין אין משימות במסלול. אפשר להוסיף משימה ראשונה למטה.
        </p>
      )}
      <TaskEditor tasks={tasks} onChange={setTasks} journeyMode />
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-lg backdrop-blur">
        <button className="btn btn-primary min-h-11" onClick={save} disabled={pending} aria-busy={pending}>
          {pending ? "שומר…" : "שמירת שינויים"}
        </button>
        <Link href={`/clinic/patients/${journeyId}`} className="btn btn-quiet min-h-11" aria-disabled={pending}>ביטול</Link>
        <div id="pedit-error" aria-live="polite" className="min-w-0 flex-1 basis-48 text-sm">
          {error && <p role="alert" className="font-medium text-bad">{error}</p>}
        </div>
      </div>
    </div>
  );
}
