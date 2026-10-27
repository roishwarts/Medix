"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui";
import { submitTask } from "../../actions";

const MAX_BYTES = 10 * 1024 * 1024;

export function SubmitPanel({
  taskId,
  journeyId,
  requiresEvidence,
  needsReview,
  resubmit = false,
}: {
  taskId: string;
  journeyId: string;
  requiresEvidence: boolean;
  needsReview: boolean;
  resubmit?: boolean;
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
      // v0: the file is optional so the whole flow can be demoed without real documents.
      const file = requiresEvidence ? fileRef.current?.files?.[0] : undefined;
      if (file) {
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

  function clearFile() {
    if (fileRef.current) fileRef.current.value = "";
    setFileName(null);
  }

  const heading = resubmit ? "שליחה מחדש" : requiresEvidence ? "העלאת מסמך" : "סיום המשימה";
  const submitLabel = pending
    ? "שולח…"
    : resubmit
      ? "שליחה מחדש לבדיקה"
      : requiresEvidence
        ? "שליחה לבדיקה"
        : needsReview
          ? "סיימתי, שליחה לבדיקה"
          : "סיימתי";

  return (
    <form
      className="card p-5"
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        if (!pending) send();
      }}
    >
      <fieldset disabled={pending} className="min-w-0 space-y-5 disabled:opacity-80">
        <legend className="display mb-4 text-xl">{heading}</legend>

        {requiresEvidence && (
          <div>
            <label htmlFor="file" className="lbl">מסמך או צילום</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="peer sr-only"
              id="file"
              aria-describedby="file-hint"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
            <label
              htmlFor="file"
              className="btn h-auto w-full cursor-pointer justify-start gap-2 whitespace-normal py-2.5 text-start peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:cursor-not-allowed"
            >
              <span className="shrink-0"><Icon name={fileName ? "file" : "plus"} /></span>
              <span className="min-w-0 break-all" dir="auto">{fileName ?? "בחירת קובץ או צילום"}</span>
            </label>
            {fileName && (
              <button type="button" className="btn btn-quiet -mx-3 mt-1" onClick={clearFile}>
                הסרת הקובץ
              </button>
            )}
            <p id="file-hint" className="mt-1.5 text-sm text-muted">
              תמונה או PDF, עד <span dir="ltr" className="num">10MB</span>. בטלפון אפשר לצלם ישירות.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="note" className="lbl">הערה לצוות (לא חובה)</label>
          <textarea
            id="note"
            name="note"
            rows={3}
            autoComplete="off"
            className="field"
            placeholder="למשל: הבדיקה בוצעה בקופה אחרת"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div role="alert" aria-live="assertive">
          {error && (
            <p className="flex items-start gap-2 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">
              <span className="mt-0.5 shrink-0"><Icon name="alert" /></span>
              <span>{error}</span>
            </p>
          )}
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {submitLabel}
        </button>
      </fieldset>
    </form>
  );
}
