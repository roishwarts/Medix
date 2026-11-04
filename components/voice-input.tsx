"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/components/i18n-provider";
import type { Lang } from "@/lib/prefs";

// The browser's built-in speech recognition (Chrome, Edge, Safari). Not in the standard TypeScript lib,
// so the small part we use is described here.
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => Recognition;

const SPEECH_LANG: Record<Lang, string> = { he: "he-IL", en: "en-US", ru: "ru-RU", ar: "ar-IL" };

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// A text area with a microphone button: press it, speak, and the words are added to the text.
// Shown as a plain text area on browsers that cannot do speech recognition.
export function VoiceTextarea({
  value, onChange, id, className = "field min-h-24", placeholder, rows,
}: {
  value: string; onChange: (v: string) => void; id?: string; className?: string; placeholder?: string; rows?: number;
}) {
  const t = useT();
  const lang = useLang();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  // Latest text, so words that arrive while talking are appended to what is there now, not what was there at the start.
  const latest = useRef(value);
  latest.current = value;
  // Mirrors `listening` synchronously (state updates are not visible to the very next event handler call),
  // so a second tap that lands before React re-renders can't start a second, overlapping recognition session.
  const activeRef = useRef(false);

  // Detaches the handlers before stopping, so a recognition session that is already winding down
  // can never call setState (or append a stray transcript) once this component no longer wants it.
  function detach(r: Recognition) {
    r.onresult = null;
    r.onerror = null;
    r.onend = null;
  }

  useEffect(() => {
    setSupported(!!getCtor());
    return () => {
      activeRef.current = false;
      if (rec.current) {
        detach(rec.current);
        rec.current.stop();
        rec.current = null;
      }
    };
  }, []);

  function toggle() {
    if (activeRef.current) {
      activeRef.current = false;
      rec.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = getCtor();
    if (!Ctor) return;
    setError(null);
    const r = new Ctor();
    r.lang = SPEECH_LANG[lang];
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let said = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) said += e.results[i][0].transcript;
      }
      said = said.trim();
      if (!said) return;
      const base = latest.current;
      const next = base && !/\s$/.test(base) ? `${base} ${said}` : `${base}${said}`;
      latest.current = next;
      onChange(next);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setError(t("אין הרשאה למיקרופון. אפשרו אותה בהגדרות הדפדפן."));
      else if (e.error !== "no-speech" && e.error !== "aborted") setError(t("ההקלטה נכשלה. נסו שוב."));
      // Some browsers skip onend after certain errors; never leave the mic looking "live" when it is not.
      // Only touch shared state if this instance is still the current one — a late event from an
      // instance the user already replaced (fast re-tap) must not clobber the newer session.
      if (rec.current === r) { activeRef.current = false; setListening(false); }
    };
    r.onend = () => { if (rec.current === r) { activeRef.current = false; setListening(false); rec.current = null; } };
    rec.current = r;
    try { activeRef.current = true; r.start(); setListening(true); } catch { activeRef.current = false; setListening(false); }
  }

  return (
    <div>
      <div className="relative">
        <textarea
          id={id} className={`${className} ${supported ? "pe-14" : ""}`} placeholder={placeholder} rows={rows}
          value={value} onChange={(e) => onChange(e.target.value)}
        />
        {supported && (
          <button
            type="button"
            onClick={toggle}
            aria-pressed={listening}
            aria-label={listening ? t("עצירת הקלטה") : t("הקלטה קולית")}
            title={listening ? t("עצירת הקלטה") : t("הקלטה קולית")}
            className={`absolute end-2 top-2 grid size-11 place-items-center rounded-full border transition ${listening ? "animate-pulse border-bad bg-bad text-white" : "border-line bg-surface text-muted hover:text-ink"}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
        )}
      </div>
      {listening && <p role="status" className="mt-1 text-xs text-bad">{t("מקשיב… לחצו שוב לעצירה")}</p>}
      {error && <p role="alert" className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  );
}
