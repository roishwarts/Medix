"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { useT } from "@/components/i18n-provider";
import { queueOrRun } from "@/lib/offline/queue";
import { setOptimisticState } from "@/components/task-optimistic";
import { toast } from "@/components/toast";

const MAX_BYTES = 10 * 1024 * 1024;

export function SubmitPanel({
  taskId,
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
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Works offline: the file (if any) and the note go into a local queue when there's no
  // connection, and sync automatically once it's back — this is one of the two actions explicitly
  // scoped as safe to queue (see lib/offline/queue.ts).
  function send() {
    setError(null);
    start(async () => {
      const file = requiresEvidence ? fileRef.current?.files?.[0] : undefined;
      if (file && file.size > MAX_BYTES) return setError(t("הקובץ גדול מדי (עד 10MB)"));

      const result = await queueOrRun({ kind: "patient_submit", taskId, note, fileBlob: file, fileName: file?.name });
      if (result.rejected) return setError(t("השליחה נכשלה. ייתכן שהמשימה כבר טופלה אחרת — רענן/י ונסה/י שוב."));
      if (result.queued) {
        setOptimisticState(taskId, requiresEvidence || needsReview ? "review" : "done");
        toast(t("אין חיבור לרגע — השמירה בוצעה במכשיר ותישלח אוטומטית כשהחיבור יחזור."));
      }
      router.push("/journey");
    });
  }

  function clearFile() {
    if (fileRef.current) fileRef.current.value = "";
    setFileName(null);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.size > MAX_BYTES) {
      setError(t("הקובץ גדול מדי (עד 10MB)"));
      clearFile();
      return;
    }
    setError(null);
    setFileName(file?.name ?? null);
  }

  const heading = resubmit ? t("שליחה מחדש") : requiresEvidence ? t("העלאת מסמך") : t("סיום המשימה");
  const submitLabel = pending
    ? t("שולח…")
    : resubmit
      ? t("שליחה מחדש לבדיקה")
      : requiresEvidence
        ? t("שליחה לבדיקה")
        : needsReview
          ? t("סיימתי, שליחה לבדיקה")
          : t("סיימתי");

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
            <label htmlFor="file" className="lbl">{t("מסמך או צילום")}</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="peer sr-only"
              id="file"
              aria-describedby="file-hint"
              onChange={onFileChange}
            />
            <label
              htmlFor="file"
              className="btn h-auto w-full cursor-pointer justify-start gap-2 whitespace-normal py-2.5 text-start peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:cursor-not-allowed"
            >
              <span className="shrink-0"><Icon name={fileName ? "file" : "plus"} /></span>
              <span className="min-w-0 break-all" dir="auto">{fileName ?? t("בחירת קובץ או צילום")}</span>
            </label>
            {fileName && (
              <>
                <p className="sr-only" role="status" aria-live="polite">{t("הקובץ {name} נבחר", { name: fileName })}</p>
                <button type="button" className="btn btn-quiet -mx-3 mt-1" onClick={clearFile}>
                  {t("הסרת הקובץ")}
                </button>
              </>
            )}
            <p id="file-hint" className="mt-1.5 text-sm text-muted">
              {t("תמונה או PDF, עד {size}. בטלפון אפשר לצלם ישירות.", { size: "10MB" })}
            </p>
          </div>
        )}

        <div>
          <label htmlFor="note" className="lbl">{t("הערה לצוות (לא חובה)")}</label>
          <textarea
            id="note"
            name="note"
            rows={3}
            autoComplete="off"
            className="field"
            placeholder={t("למשל: הבדיקה בוצעה בקופה אחרת")}
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
