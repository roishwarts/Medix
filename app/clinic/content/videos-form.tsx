"use client";

import { useId, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui";
import { addClinicVideo, removeClinicVideo } from "./actions";

type Video = { id: string; title: string; phase: "before" | "after" };
const MAX_BYTES = 200 * 1024 * 1024;
const PHASE_LABEL: Record<Video["phase"], string> = { before: "לפני הניתוח", after: "אחרי הניתוח" };

function VideoList({ title, videos, pending, onRemove }: { title: string; videos: Video[]; pending: boolean; onRemove: (id: string, title: string) => void }) {
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
                aria-label={`הסרת ${v.title}`}
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
        <p className="mt-2 rounded-2xl bg-paper px-3 py-3 text-sm text-muted">עוד לא הועלו סרטונים.</p>
      )}
    </div>
  );
}

export function VideosForm({ clinicId, videos }: { clinicId: string; videos: Video[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Video["phase"]>("before");
  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const phaseId = useId();
  const titleId = useId();
  const fileId = useId();

  function remove(id: string, label: string) {
    if (!confirm(`להסיר את "${label}"?`)) return;
    start(async () => { await removeClinicVideo(id); });
  }

  function upload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("יש לבחור קובץ וידאו");
    if (file.size > MAX_BYTES) return setError("הקובץ גדול מדי (עד 200MB)");
    const t = title.trim();
    if (!t) return setError("יש להזין שם לסרטון");
    start(async () => {
      const ext = (file.name.split(".").pop() ?? "mp4").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) || "mp4";
      const path = `${clinicId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await createClient().storage.from("clinic-videos").upload(path, file, { contentType: file.type || undefined });
      if (upErr) return setError("העלאת הקובץ נכשלה. ודאו שהורצה התוספת supabase/patch-patient-content.sql.");
      const res = await addClinicVideo(t, phase, path);
      if (res.error) return setError(res.error);
      setTitle("");
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  const before = videos.filter((v) => v.phase === "before");
  const after = videos.filter((v) => v.phase === "after");

  return (
    <div className="card p-4 sm:p-5">
      <h3 className="font-semibold">סרטוני הדרכה</h3>
      <p className="mt-1 text-sm text-muted">סרטונים קצרים שמופיעים בעמוד המסלול של כל מטופלי המרפאה, לפי שלב: לפני הניתוח או אחריו.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <VideoList title={PHASE_LABEL.before} videos={before} pending={pending} onRemove={remove} />
        <VideoList title={PHASE_LABEL.after} videos={after} pending={pending} onRemove={remove} />
      </div>

      <form onSubmit={upload} className="mt-5 space-y-3 border-t border-line pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={titleId} className="lbl">שם הסרטון</label>
            <input id={titleId} className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} autoComplete="off" placeholder="למשל: תרגילי חימום לפני הניתוח" />
          </div>
          <div>
            <label htmlFor={phaseId} className="lbl">שלב</label>
            <select id={phaseId} className="field" value={phase} onChange={(e) => setPhase(e.target.value as Video["phase"])}>
              <option value="before">{PHASE_LABEL.before}</option>
              <option value="after">{PHASE_LABEL.after}</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor={fileId} className="lbl">קובץ וידאו</label>
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="peer sr-only"
            id={fileId}
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          <label
            htmlFor={fileId}
            className="btn h-auto w-full cursor-pointer justify-start gap-2 whitespace-normal py-2.5 text-start peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
          >
            <span className="shrink-0"><Icon name={fileName ? "file" : "plus"} /></span>
            <span className="min-w-0 break-all" dir="auto">{fileName ?? "בחירת קובץ וידאו, עד 200MB"}</span>
          </label>
        </div>
        <button className="btn btn-sm" disabled={pending}>{pending ? "מעלה…" : "העלאה"}</button>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </form>
    </div>
  );
}
