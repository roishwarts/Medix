"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { submitTask } from "../../actions";

const MAX_BYTES = 10 * 1024 * 1024;

export function SubmitPanel({
  taskId,
  journeyId,
  requiresEvidence,
  needsReview,
}: {
  taskId: string;
  journeyId: string;
  requiresEvidence: boolean;
  needsReview: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send() {
    setError(null);
    start(async () => {
      let path: string | undefined;
      let name: string | undefined;
      if (requiresEvidence) {
        const file = fileRef.current?.files?.[0];
        if (!file) return setError("יש לבחור קובץ");
        if (file.size > MAX_BYTES) return setError("הקובץ גדול מדי (עד 10MB)");
        const ext = (file.name.split(".").pop() ?? "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "bin";
        path = `${journeyId}/${taskId}/${crypto.randomUUID()}.${ext}`;
        name = file.name;
        const { error: upErr } = await createClient().storage.from("evidence").upload(path, file, { contentType: file.type || undefined });
        if (upErr) return setError("העלאת הקובץ נכשלה. נסה/י שוב.");
      }
      const res = await submitTask(taskId, { path, name, note });
      if (res.error) return setError(res.error);
      router.push("/journey");
      router.refresh();
    });
  }

  return (
    <section className="mt-8 space-y-4">
      {requiresEvidence && (
        <div>
          <label className="lbl">קובץ (תמונה או PDF)</label>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" capture={undefined} className="sr-only" id="file"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
          <label htmlFor="file" className="btn w-full cursor-pointer justify-start">
            {fileName ?? "בחירת קובץ או צילום"}
          </label>
        </div>
      )}
      <div>
        <label htmlFor="note" className="lbl">הערה לצוות (לא חובה)</label>
        <textarea id="note" className="field" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      <button className="btn btn-primary w-full" onClick={send} disabled={pending}>
        {pending ? "שולח…" : requiresEvidence ? "שליחה לבדיקה" : needsReview ? "סיימתי, שליחה לבדיקה" : "סיימתי"}
      </button>
    </section>
  );
}
