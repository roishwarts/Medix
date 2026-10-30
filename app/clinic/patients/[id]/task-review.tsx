"use client";

import { useEffect, useState, useTransition } from "react";
import { useT } from "@/components/i18n-provider";
import { reviewTask } from "../actions";
import type { Owner, TaskState } from "@/lib/journey";
import { setOptimisticState, useTaskState } from "@/components/task-optimistic";

export function TaskReview({ taskId, state: serverState, owner }: { taskId: string; state: TaskState; owner: Owner }) {
  const t = useT();
  const state = useTaskState(taskId, serverState);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // The real state arrived from the server: the instant (optimistic) one is no longer needed.
  useEffect(() => { setOptimisticState(taskId, null); }, [taskId, serverState]);

  function run(decision: "accept" | "reject" | "reopen") {
    setError(null);
    // Show the outcome immediately; the server confirms (or we roll back) a moment later.
    setOptimisticState(taskId, decision === "accept" ? "done" : decision === "reject" ? "rejected" : "todo");
    setRejecting(false);
    start(async () => {
      try {
        const res = await reviewTask(taskId, decision, note);
        if (res?.error) { setOptimisticState(taskId, null); setError(res.error); if (decision === "reject") setRejecting(true); }
        else setNote("");
      } catch {
        setOptimisticState(taskId, null);
        setError(t("הפעולה נכשלה. נסו שוב."));
      }
    });
  }

  if (state === "locked") return null;

  return (
    <div className="mt-3">
      {rejecting ? (
        <div className="space-y-2">
          <label className="lbl" htmlFor={`n-${taskId}`}>{t("מה צריך לתקן?")}</label>
          <textarea id={`n-${taskId}`} className="field" placeholder={t("למשל: התמונה לא ברורה, נא לצלם שוב")} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <button className="btn btn-danger btn-sm min-h-11 flex-1 sm:min-h-9 sm:flex-none" disabled={pending} onClick={() => run("reject")}>{t("החזרה לתיקון")}</button>
            <button className="btn btn-quiet btn-sm min-h-11 sm:min-h-9" onClick={() => setRejecting(false)}>{t("ביטול")}</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 [&>.btn]:min-h-11 sm:[&>.btn]:min-h-9 [&>.btn]:flex-1 sm:[&>.btn]:flex-none">
          {state === "review" && (
            <>
              <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => run("accept")}>{pending ? t("שומר…") : t("אישור")}</button>
              <button className="btn btn-sm" disabled={pending} onClick={() => setRejecting(true)}>{t("החזרה לתיקון")}</button>
            </>
          )}
          {(state === "todo" || state === "rejected") && (
            <button className="btn btn-sm" disabled={pending} onClick={() => run("accept")}>
              {owner === "patient" ? t("סימון כהושלם ידנית") : t("סימון כבוצע")}
            </button>
          )}
          {state === "done" && (
            <button className="btn btn-quiet btn-sm" disabled={pending} onClick={() => run("reopen")}>{t("פתיחה מחדש")}</button>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
