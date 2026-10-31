"use client";

import { useId, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui";
import { saveClinicLogo, removeClinicLogo, saveClinicBrandColor } from "./actions";

const MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_COLOR = "#4b6584";

export function LogoForm({ clinicId, logoUrl, brandColor }: { clinicId: string; logoUrl: string | null; brandColor: string | null }) {
  const [preview, setPreview] = useState(logoUrl);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [color, setColor] = useState(brandColor ?? DEFAULT_COLOR);
  const [colorSaved, setColorSaved] = useState(false);
  const [colorError, setColorError] = useState<string | null>(null);
  const [colorPending, startColor] = useTransition();

  const fileId = useId();
  const colorId = useId();

  function pick(file: File) {
    setError(null);
    if (file.size > MAX_BYTES) return setError("הקובץ גדול מדי (עד 2MB)");
    if (!file.type.startsWith("image/")) return setError("יש להעלות קובץ תמונה");
    // Show the file instantly (before the network round trip) so the upload doesn't feel like a black box.
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    start(async () => {
      const path = `${clinicId}/logo`;
      const { error: upErr } = await createClient().storage.from("clinic-logos").upload(path, file, { contentType: file.type, upsert: true });
      setUploading(false);
      if (upErr) return setError("ההעלאה נכשלה. ודאו שהורצה התוספת supabase/patch-clinic-logo.sql.");
      const res = await saveClinicLogo(path);
      if (res.error) setError(res.error);
    });
  }

  function remove() {
    if (!confirm("להסיר את הלוגו?")) return;
    start(async () => {
      await removeClinicLogo();
      setPreview(null);
    });
  }

  function saveColor() {
    setColorError(null);
    setColorSaved(false);
    startColor(async () => {
      const res = await saveClinicBrandColor(color);
      if (res.error) setColorError(res.error);
      else setColorSaved(true);
    });
  }

  return (
    <div className="card p-4 sm:p-5">
      <h3 className="font-semibold">מיתוג</h3>
      <p className="mt-1 text-sm text-muted">הלוגו וצבע המרפאה מופיעים לכל מי שנכנס למערכת — מטופלים וגם צוות.</p>

      <div className="mt-4 flex items-center gap-4">
        {/* A fixed light chip around the logo: most logos are designed for a light backdrop, so this
            keeps them legible in dark mode too without asking the clinic to upload two versions. */}
        {preview ? (
          <span className="grid size-16 shrink-0 place-items-center rounded-xl border border-line bg-white p-1.5">
            <img src={preview} alt="הלוגו הנוכחי" className="max-h-full max-w-full object-contain" />
          </span>
        ) : (
          <div className="grid size-16 shrink-0 place-items-center rounded-xl border border-dashed border-line-strong text-muted">
            <Icon name="file" />
          </div>
        )}
        <div>
          <input ref={fileRef} type="file" accept="image/*" className="peer sr-only" id={fileId}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }} />
          <label htmlFor={fileId} className="btn btn-sm cursor-pointer peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
            {uploading ? "מעלה…" : preview ? "החלפת לוגו" : "העלאת לוגו"}
          </label>
          {preview && (
            <button type="button" className="btn btn-quiet btn-sm ms-2" disabled={pending} onClick={remove}>הסרה</button>
          )}
          <p className="mt-1.5 text-sm text-muted">תמונה מרובעת, עד 2MB.</p>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}

      <div className="mt-5 border-t border-line pt-4">
        <label htmlFor={colorId} className="lbl">צבע ראשי</label>
        <div className="mt-1 flex items-center gap-3">
          <input
            id={colorId}
            type="color"
            value={color}
            onChange={(e) => { setColor(e.target.value); setColorSaved(false); }}
            className="size-11 shrink-0 cursor-pointer rounded-lg border border-line p-0.5"
          />
          <span className="num text-sm text-muted" dir="ltr">{color}</span>
          <button type="button" className="btn btn-sm" onClick={saveColor} disabled={colorPending}>
            {colorPending ? "שומר…" : "שמירה"}
          </button>
          {colorSaved && <span role="status" className="text-sm text-ok">נשמר</span>}
        </div>
        {colorError && <p role="alert" className="mt-2 text-sm text-bad">{colorError}</p>}
      </div>
    </div>
  );
}
