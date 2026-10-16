"use client";

import { useState, useTransition } from "react";
import { reviewTask } from "../actions";
import type { Owner, TaskState } from "@/lib/journey";

export function TaskReview({ taskId, state, owner }: { taskId: string; state: TaskState; owner: Owner }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(decision: "accept" | "reject" | "reopen") {
    setError(null);
    start(async () => {
      const res = await reviewTask(taskId, decision, note);
      if (res.error) setError(res.error);
      else { setRejecting(false); setNote(""); }
    });
  }

  if (state === "locked") return null;

  return (
    <div className="mt-3">
      {rejecting ? (
        <div className="space-y-2">
          <label className="lbl" htmlFor={`n-${taskId}`}>מה צריך לתקן?</label>
          <textarea id={`n-${taskId}`} className="field" value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => run("reject")}>החזרה לתיקון</button>
            <button className="btn btn-quiet btn-sm" onClick={() => setRejecting(false)}>ביטול</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {state === "review" && (
            <>
              <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => run("accept")}>אישור</button>
              <button className="btn btn-sm" disabled={pending} onClick={() => setRejecting(true)}>החזרה לתיקון</button>
            </>
          )}
          {(state === "todo" || state === "rejected") && (
            <button className="btn btn-sm" disabled={pending} onClick={() => run("accept")}>
              {owner === "patient" ? "סימון כהושלם ידנית" : "סימון כבוצע"}
            </button>
          )}
          {state === "done" && (
            <button className="btn btn-quiet btn-sm" disabled={pending} onClick={() => run("reopen")}>פתיחה מחדש</button>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
