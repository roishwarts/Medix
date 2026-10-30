"use client";

import { useEffect, useRef, useState } from "react";
import { LANGS, type Prefs } from "@/lib/prefs";
import { useT } from "@/components/i18n-provider";
import { usePrefs } from "@/components/prefs-provider";

const SIZE_LABELS = ["קטן", "רגיל", "גדול", "גדול מאוד", "ענק"] as const;
const THEMES: { value: Prefs["theme"]; label: string }[] = [
  { value: "light", label: "בהיר" },
  { value: "dark", label: "כהה" },
  { value: "system", label: "לפי המכשיר" },
];

function Glyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="4.5" r="1.8" />
      <path d="M4.5 8.5c5 1.3 10 1.3 15 0M12 8v5.5m0 0-3.5 7m3.5-7 3.5 7" />
    </svg>
  );
}

// The button and the panel with colors, text size and (where available) language.
export function AccessMenu({ languages = true, className = "" }: { languages?: boolean; className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("touchstart", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog" aria-label={t("נגישות והעדפות")}
        className="btn btn-icon btn-quiet size-11"
      >
        <Glyph />
      </button>
      {open && (
        <div
          role="dialog" aria-label={t("נגישות והעדפות")}
          className="card fixed inset-x-3 top-16 z-[70] max-h-[80dvh] overflow-y-auto bg-[var(--color-surface)] p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:end-0 sm:top-full sm:mt-2 sm:w-80"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="display text-lg">{t("נגישות והעדפות")}</h2>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(false)}>{t("סגירה")}</button>
          </div>

          <AccessControls languages={languages} />
        </div>
      )}
    </div>
  );
}

// Colors, text size and (where available) language. Used in the popover and inside the phone menu.
export function AccessControls({ languages = true }: { languages?: boolean }) {
  const t = useT();
  const { prefs, update } = usePrefs();
  const seg = "flex-1 min-h-11 rounded-xl border px-2 text-sm transition-colors";
  const on = "border-accent bg-accent-soft font-medium text-ink";
  const off = "border-edge text-muted hover:bg-[var(--hover-tint)] hover:text-ink";
  return (
    <>
    <fieldset className="mt-4 first:mt-0">
      <legend className="lbl">{t("תצוגה")}</legend>
      <div className="flex gap-2">
        {THEMES.map((x) => (
          <button key={x.value} type="button" aria-pressed={prefs.theme === x.value} className={`${seg} ${prefs.theme === x.value ? on : off}`} onClick={() => update({ theme: x.value })}>
            {t(x.label)}
          </button>
        ))}
      </div>
    </fieldset>

    <fieldset className="mt-4 first:mt-0">
      <legend className="lbl">{t("גודל טקסט")}: {t(SIZE_LABELS[prefs.size])}</legend>
      <div className="flex items-center gap-2">
        <button type="button" className="btn size-11 px-0 text-sm" aria-label={t("הקטנת טקסט")} disabled={prefs.size === 0} onClick={() => update({ size: (prefs.size - 1) as Prefs["size"] })}>A−</button>
        <div className="flex flex-1 justify-center gap-1.5" aria-hidden>
          {SIZE_LABELS.map((_, i) => <span key={i} className={`h-2 w-6 rounded-full ${i <= prefs.size ? "bg-accent" : "bg-line"}`} />)}
        </div>
        <button type="button" className="btn size-11 px-0 text-lg" aria-label={t("הגדלת טקסט")} disabled={prefs.size === 4} onClick={() => update({ size: (prefs.size + 1) as Prefs["size"] })}>A+</button>
      </div>
    </fieldset>

    {languages && (
      <fieldset className="mt-4 first:mt-0">
        <legend className="lbl">{t("שפה")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {LANGS.map((l) => (
            <button key={l.code} type="button" lang={l.code} aria-pressed={prefs.lang === l.code} className={`${seg} ${prefs.lang === l.code ? on : off}`} onClick={() => update({ lang: l.code })}>
              {l.label}
            </button>
          ))}
        </div>
      </fieldset>
    )}
    </>
  );
}
