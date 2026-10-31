"use client";

import { useState, useTransition } from "react";
import { useT } from "@/components/i18n-provider";
import { saveVisitNote } from "./notes-actions";

export function VisitNote({ taskId, initialNote }: { taskId: string; initialNote: string }) {
  const t = useT();
  const [open, setOpen] = useState(!!initialNote);
  const [note, setNote] = useState(initialNote);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const res = await saveVisitNote(taskId, note);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-sm font-medium text-accent hover:underline">
        {t("הוספת הערת ביקור")}
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-line bg-paper p-3">
      <label className="lbl" htmlFor={`visit-note-${taskId}`}>{t("הערת ביקור (רופא בלבד)")}</label>
      <textarea
        id={`visit-note-${taskId}`}
        className="field min-h-20 w-full"
        placeholder={t("מה נאמר בפגישה, מה סוכם, מה צריך להמשיך…")}
        value={note}
        onChange={(e) => { setNote(e.target.value); setSaved(false); }}
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button className="btn btn-sm min-h-11 sm:min-h-9" onClick={save} disabled={pending || saved}>
          {pending ? t("שומר…") : t("שמירת ההערה")}
        </button>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        {saved && !pending && <p role="status" className="text-sm text-ok">{t("נשמר.")}</p>}
      </div>
    </div>
  );
}
