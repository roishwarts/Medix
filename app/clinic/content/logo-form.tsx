"use client";

import { useId, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui";
import { saveClinicLogo, removeClinicLogo } from "./actions";

const MAX_BYTES = 2 * 1024 * 1024;

export function LogoForm({ clinicId, logoUrl }: { clinicId: string; logoUrl: string | null }) {
  const [preview, setPreview] = useState(logoUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileId = useId();

  function upload(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) return setError("הקובץ גדול מדי (עד 2MB)");
    if (!file.type.startsWith("image/")) return setError("יש להעלות קובץ תמונה");
    start(async () => {
      const path = `${clinicId}/logo`;
      const { error: upErr } = await createClient().storage.from("clinic-logos").upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) return setError("ההעלאה נכשלה. ודאו שהורצה התוספת supabase/patch-clinic-logo.sql.");
      const res = await saveClinicLogo(path);
      if (res.error) return setError(res.error);
      setPreview(`${URL.createObjectURL(file)}`);
    });
  }

  function remove() {
    if (!confirm("להסיר את הלוגו?")) return;
    start(async () => {
      await removeClinicLogo();
      setPreview(null);
    });
  }

  return (
    <div className="card p-4 sm:p-5">
      <h3 className="font-semibold">מיתוג</h3>
      <p className="mt-1 text-sm text-muted">הלוגו מופיע בכותרת העליונה לכל מי שנכנס למערכת — מטופלים וגם צוות.</p>
      <div className="mt-4 flex items-center gap-4">
        {preview ? (
          <img src={preview} alt="הלוגו הנוכחי" className="size-16 shrink-0 rounded-xl border border-line object-contain" />
        ) : (
          <div className="grid size-16 shrink-0 place-items-center rounded-xl border border-dashed border-line-strong text-muted">
            <Icon name="file" />
          </div>
        )}
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="peer sr-only" id={fileId}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          <label htmlFor={fileId} className="btn btn-sm cursor-pointer peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
            {pending ? "מעלה…" : preview ? "החלפת לוגו" : "העלאת לוגו"}
          </label>
          {preview && (
            <button type="button" className="btn btn-quiet btn-sm ms-2" disabled={pending} onClick={remove}>הסרה</button>
          )}
          <p className="mt-1.5 text-sm text-muted">תמונה מרובעת, עד 2MB.</p>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
