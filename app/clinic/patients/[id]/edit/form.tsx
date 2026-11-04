"use client";

import { useT } from "@/components/i18n-provider";
import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskEditor } from "@/components/editor/task-editor";
import type { EditorTask } from "@/components/editor/types";
import { validateTasksDetailed } from "@/lib/template-payload";
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
  const t = useT();
  const router = useRouter();
  const [date, setDate] = useState(surgeryDate);
  const [tasks, setTasks] = useState(initialTasks);
  const [error, setError] = useState<string | null>(null);
  const [focusTask, setFocusTask] = useState<{ id: string; nonce: number } | null>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    if (!date) {
      setError(t("יש לבחור תאריך ניתוח"));
      dateRef.current?.focus();
      return;
    }
    // Validate locally first (same rules the server applies) so a missing title or a dependency
    // cycle is caught, explained and pointed at immediately, instead of after a round trip.
    const invalid = validateTasksDetailed(tasks, t);
    if (invalid) {
      setError(invalid.error);
      if (invalid.taskId) setFocusTask({ id: invalid.taskId, nonce: Date.now() });
      return;
    }
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
        <label className="lbl" htmlFor="date">{t("תאריך ניתוח")}</label>
        <input
          ref={dateRef}
          id="date"
          type="date"
          required
          aria-required="true"
          className="field"
          value={date}
          aria-describedby="date-hint"
          onChange={(e) => setDate(e.target.value)}
        />
        <p id="date-hint" className="mt-1.5 text-sm text-muted">{t("מועדי המשימות מחושבים לפי תאריך זה.")}</p>
      </div>
      <TaskEditor tasks={tasks} onChange={setTasks} journeyMode focusTask={focusTask} />
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-lg backdrop-blur">
        <button className="btn btn-primary min-h-11" onClick={save} disabled={pending} aria-busy={pending}>
          {pending ? t("שומר…") : t("שמירת שינויים")}
        </button>
        <Link href={`/clinic/patients/${journeyId}`} className="btn btn-quiet min-h-11" aria-disabled={pending}>{t("ביטול")}</Link>
        <div id="pedit-error" aria-live="polite" className="min-w-0 flex-1 basis-48 text-sm">
          {error && <p role="alert" className="font-medium text-bad">{error}</p>}
        </div>
      </div>
    </div>
  );
}
