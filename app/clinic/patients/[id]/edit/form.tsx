"use client";

import { useState, useTransition } from "react";
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
    <div className="mt-6 space-y-8">
      <div className="max-w-xs">
        <label className="lbl" htmlFor="date">תאריך ניתוח</label>
        <input id="date" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <TaskEditor tasks={tasks} onChange={setTasks} journeyMode />
      <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-5 py-4 backdrop-blur">
        <button className="btn btn-primary" onClick={save} disabled={pending}>{pending ? "שומר…" : "שמירת שינויים"}</button>
        {error && <span role="alert" className="text-sm text-bad">{error}</span>}
      </div>
    </div>
  );
}
