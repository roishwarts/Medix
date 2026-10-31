"use client";

import { useT } from "@/components/i18n-provider";
import { useId, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui";
import { addClinicVideo, removeClinicVideo } from "./actions";

type Video = { id: string; title: string; phase: "before" | "after" };
const MAX_BYTES = 200 * 1024 * 1024;
const PHASE_LABEL: Record<Video["phase"], string> = { before: "לפני הניתוח", after: "אחרי הניתוח" };

function VideoList({ title, videos, pending, onRemove }: { title: string; videos: Video[]; pending: boolean; onRemove: (id: string, title: string) => void }) {
  const t = useT();
  return (
    <div>
      <h4 className="text-sm font-medium text-muted">{title}</h4>
      {videos.length > 0 ? (
        <ul className="mt-2 divide-y divide-line">
          {videos.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate">{v.title}</span>
              <button
                type="button"
                aria-label={t("הסרת {name}", { name: v.title })}
                disabled={pending}
                className="relative grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-black/10 hover:text-ink disabled:opacity-50"
                onClick={() => onRemove(v.id, v.title)}
              >
                <Icon name="trash" size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 rounded-2xl bg-paper px-3 py-3 text-sm text-muted">{t("עוד לא הועלו סרטונים.")}</p>
      )}
    </div>
  );
}

export function VideosForm({ clinicId, videos }: { clinicId: string; videos: Video[] }) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Video["phase"]>("before");
  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [pending, start] = useTransition();
  const phaseId = useId();
  const titleId = useId();
  const fileId = useId();

  function remove(id: string, label: string) {
    if (!confirm(t("להסיר את \"{label}\"?", { label }))) return;
    start(async () => { await removeClinicVideo(id); });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setError(null);
    setUploaded(false);
    // Catch an oversized file the moment it's picked, not after the clinic has filled in the rest of the form.
    if (f && f.size > MAX_BYTES) {
      setFileName(null);
      setError(t("הקובץ גדול מדי (עד 200MB)"));
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setFileName(f?.name ?? null);
  }

  function upload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUploaded(false);
    const file = fileRef.current?.files?.[0];
    if (!file) return setError(t("יש לבחור קובץ וידאו"));
    if (file.size > MAX_BYTES) return setError(t("הקובץ גדול מדי (עד 200MB)"));
    const name = title.trim();
    if (!name) return setError(t("יש להזין שם לסרטון"));
    start(async () => {
      const ext = (file.name.split(".").pop() ?? "mp4").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "mp4";
      const path = `${clinicId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await createClient().storage.from("clinic-videos").upload(path, file, { contentType: file.type || undefined });
      if (upErr) return setError(t("העלאת הקובץ נכשלה. ודאו שהורצה התוספת supabase/patch-patient-content.sql."));
      const res = await addClinicVideo(name, phase, path);
      if (res.error) return setError(res.error);
      setTitle("");
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
      setUploaded(true);
    });
  }

  const before = videos.filter((v) => v.phase === "before");
  const after = videos.filter((v) => v.phase === "after");

  return (
    <div className="card p-4 sm:p-5">
      <h3 className="font-semibold">{t("סרטוני הדרכה")}</h3>
      <p className="mt-1 text-sm text-muted">{t("סרטונים קצרים שמופיעים בעמוד המסלול של כל מטופלי המרפאה, לפי שלב: לפני הניתוח או אחריו.")}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <VideoList title={t(PHASE_LABEL.before)} videos={before} pending={pending} onRemove={remove} />
        <VideoList title={t(PHASE_LABEL.after)} videos={after} pending={pending} onRemove={remove} />
      </div>

      <form onSubmit={upload} className="mt-5 space-y-3 border-t border-line pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={titleId} className="lbl">{t("שם הסרטון")}</label>
            <input id={titleId} className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} autoComplete="off" placeholder={t("למשל: תרגילי חימום לפני הניתוח")} />
          </div>
          <div>
            <label htmlFor={phaseId} className="lbl">{t("שלב")}</label>
            <select id={phaseId} className="field" value={phase} onChange={(e) => setPhase(e.target.value as Video["phase"])}>
              <option value="before">{t(PHASE_LABEL.before)}</option>
              <option value="after">{t(PHASE_LABEL.after)}</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor={fileId} className="lbl">{t("קובץ וידאו")}</label>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="peer sr-only"
            id={fileId}
            disabled={pending}
            onChange={onFile}
          />
          <label
            htmlFor={fileId}
            className="btn h-auto w-full cursor-pointer justify-start gap-2 whitespace-normal py-2.5 text-start peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent peer-disabled:cursor-not-allowed peer-disabled:opacity-45"
          >
            <span className="shrink-0"><Icon name={fileName ? "file" : "plus"} /></span>
            <span className="min-w-0 break-all" dir="auto">{fileName ?? t("בחירת קובץ וידאו, עד 200MB")}</span>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-sm" disabled={pending}>{pending ? t("מעלה…") : t("העלאה")}</button>
          {pending && <span role="status" className="text-sm text-muted">{t("ייתכן שזה יקח זמן, בהתאם לגודל הקובץ ולמהירות האינטרנט. אין לסגור את הדף.")}</span>}
          {uploaded && <span role="status" className="text-sm text-ok">{t("הועלה")}</span>}
        </div>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </form>
    </div>
  );
}
