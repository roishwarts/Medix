"use client";

import { useT } from "@/components/i18n-provider";
import { useId, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/ui";
import { saveClinicLogo, removeClinicLogo, saveClinicBrandColor, saveClinicBrandDark } from "./actions";

const MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_COLOR = "#4b6584";
const DEFAULT_DARK = "#1b2430";

// One color picker + hex field + save button, reused for the accent color and the dark/top-bar
// color below it - same behavior, just a different target field and default.
function ColorField({
  label, defaultColor, initial, onSave,
}: {
  label: string; defaultColor: string; initial: string | null; onSave: (color: string) => Promise<{ error?: string }>;
}) {
  const t = useT();
  const [color, setColor] = useState(initial ?? defaultColor);
  const [hexInput, setHexInput] = useState(initial ?? defaultColor);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const colorId = useId();
  const hexId = useId();

  function onPickerChange(v: string) {
    setColor(v);
    setHexInput(v);
    setSaved(false);
  }

  function onHexChange(v: string) {
    setHexInput(v);
    const val = v.startsWith("#") ? v : `#${v}`;
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setColor(val);
      setSaved(false);
    }
  }

  const hexValid = /^#?[0-9a-fA-F]{6}$/.test(hexInput);

  function save() {
    setError(null);
    setSaved(false);
    if (!hexValid) return setError(t("צבע לא תקין"));
    start(async () => {
      const res = await onSave(color);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <div>
      <label htmlFor={colorId} className="lbl">{label}</label>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <input
          id={colorId}
          type="color"
          aria-label={label}
          value={hexValid ? (hexInput.startsWith("#") ? hexInput : `#${hexInput}`) : color}
          onChange={(e) => onPickerChange(e.target.value)}
          className="size-11 shrink-0 cursor-pointer rounded-lg border border-line p-0.5"
        />
        <div>
          <label htmlFor={hexId} className="sr-only">{t("קוד צבע (הקס)")}</label>
          <input
            id={hexId}
            className="field num w-28 text-center"
            dir="ltr"
            value={hexInput}
            onChange={(e) => onHexChange(e.target.value)}
            maxLength={7}
            placeholder={defaultColor}
            aria-invalid={hexInput.length > 0 && !hexValid}
          />
        </div>
        <button type="button" className="btn btn-sm" onClick={save} disabled={pending}>
          {pending ? t("שומר…") : t("שמירה")}
        </button>
        {saved && <span role="status" className="text-sm text-ok">{t("נשמר")}</span>}
      </div>
      {hexInput.length > 0 && !hexValid && <p className="mt-1.5 text-sm text-muted">{t("קוד צבע בפורמט הקס, למשל {example}", { example: defaultColor })}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}

export function LogoForm({
  clinicId, logoUrl, brandColor, brandDark,
}: {
  clinicId: string; logoUrl: string | null; brandColor: string | null; brandDark: string | null;
}) {
  const t = useT();
  const [preview, setPreview] = useState(logoUrl);
  const [uploading, setUploading] = useState(false);
  const [logoSaved, setLogoSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileId = useId();

  function pick(file: File) {
    setError(null);
    setLogoSaved(false);
    if (file.size > MAX_BYTES) return setError(t("הקובץ גדול מדי (עד 2MB)"));
    if (!file.type.startsWith("image/")) return setError(t("יש להעלות קובץ תמונה"));
    // Show the file instantly (before the network round trip) so the upload doesn't feel like a black box.
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    start(async () => {
      const path = `${clinicId}/logo`;
      const { error: upErr } = await createClient().storage.from("clinic-logos").upload(path, file, { contentType: file.type, upsert: true });
      setUploading(false);
      if (upErr) return setError(t("ההעלאה נכשלה. ודאו שהורצה התוספת supabase/patch-clinic-logo.sql."));
      const res = await saveClinicLogo(path);
      if (res.error) setError(res.error);
      else setLogoSaved(true);
    });
  }

  function remove() {
    if (!confirm(t("להסיר את הלוגו? הסרה תמחק את הלוגו מכל עמודי המטופלים באופן מיידי."))) return;
    setLogoSaved(false);
    start(async () => {
      const res = await removeClinicLogo();
      if (res.error) setError(res.error);
      else setPreview(null);
    });
  }

  return (
    <div className="card p-4 sm:p-5">
      <h3 className="font-semibold">{t("מיתוג")}</h3>
      <p className="mt-1 text-sm text-muted">{t("הלוגו וצבעי המרפאה מופיעים לכל מי שנכנס למערכת — מטופלים וגם צוות.")}</p>

      <div className="mt-4 flex items-center gap-4">
        {/* A fixed light chip around the logo: most logos are designed for a light backdrop, so this
            keeps them legible in dark mode too without asking the clinic to upload two versions. */}
        {preview ? (
          <span className="grid size-16 shrink-0 place-items-center rounded-xl border border-line bg-white p-1.5">
            <img src={preview} alt={t("הלוגו הנוכחי")} className="max-h-full max-w-full object-contain" />
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
            {uploading ? t("מעלה…") : preview ? t("החלפת לוגו") : t("העלאת לוגו")}
          </label>
          {preview && (
            <button type="button" className="btn btn-quiet btn-sm ms-2" disabled={pending} onClick={remove}>{t("הסרה")}</button>
          )}
          <p className="mt-1.5 text-sm text-muted">{t("תמונה מרובעת, עד 2MB.")}</p>
        </div>
      </div>
      {logoSaved && <p role="status" className="mt-2 text-sm text-ok">{t("נשמר")}</p>}
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}

      <div className="mt-5 space-y-5 border-t border-line pt-4">
        <ColorField label={t("צבע ראשי")} defaultColor={DEFAULT_COLOR} initial={brandColor} onSave={saveClinicBrandColor} />
        <div>
          <ColorField label={t("צבע כהה (סרגלים ומסך הפתיחה למטופל)")} defaultColor={DEFAULT_DARK} initial={brandDark} onSave={saveClinicBrandDark} />
          <p className="mt-1.5 text-sm text-muted">{t("לא חובה. בלעדיו הסרגלים נשארים בעיצוב הבהיר הרגיל.")}</p>
        </div>
      </div>
    </div>
  );
}
