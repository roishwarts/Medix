"use client";

import { useState, useTransition } from "react";
import { scheduleTask } from "../actions";

export function ScheduleControl({ taskId, initialLocal, initialLocation }: { taskId: string; initialLocal: string; initialLocation: string }) {
  const [local, setLocal] = useState(initialLocal);
  const [location, setLocation] = useState(initialLocation);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await scheduleTask(taskId, local, location);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-line bg-paper p-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
      <div className="min-w-0">
        <label className="lbl" htmlFor={`when-${taskId}`}>מועד התור</label>
        <input id={`when-${taskId}`} type="datetime-local" dir="ltr" className="field num" value={local}
          onChange={(e) => { setLocal(e.target.value); setSaved(false); }} />
      </div>
      <div className="min-w-0">
        <label className="lbl" htmlFor={`loc-${taskId}`}>מיקום</label>
        <input id={`loc-${taskId}`} className="field" value={location}
          onChange={(e) => { setLocation(e.target.value); setSaved(false); }} />
      </div>
      <button className="btn btn-sm" onClick={save} disabled={pending}>{pending ? "שומר…" : "שמירת מועד"}</button>
      {error && <p role="alert" className="text-sm text-bad sm:col-span-3">{error}</p>}
      {saved && <p className="text-sm text-ok sm:col-span-3">נשמר. התור מופיע ביומן.</p>}
    </div>
  );
}
