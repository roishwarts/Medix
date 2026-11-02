"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useT, useLang } from "@/components/i18n-provider";
import { formatDate } from "@/lib/dates";
import { searchPatients, type PatientSearchResult } from "@/app/clinic/patients/actions";

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M13 13l-2.5-2.5" />
    </svg>
  );
}

// A clinic-wide quick search: jump straight to a patient by name from anywhere under /clinic,
// instead of opening the patients list and filtering it first. Ctrl/Cmd+K opens it from any page;
// the visible button covers staff on a touch device with no keyboard.
export function CommandPalette() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [active, setActive] = useState(0);
  const [searching, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setResults([]);
    setActive(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onEsc);
    return () => { cancelAnimationFrame(id); document.removeEventListener("keydown", onEsc); };
  }, [open]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(() => {
      start(async () => setResults(await searchPatients(q)));
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  function go(id: string) {
    setOpen(false);
    router.push(`/clinic/patients/${id}`);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active].id); }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-quiet btn-sm gap-1.5" aria-label={t("חיפוש מטופל")}>
        <SearchIcon />
        <span className="hidden sm:inline">{t("חיפוש מטופל")}</span>
        <kbd className="hidden rounded border border-line px-1 text-xs text-muted sm:inline">⌘K</kbd>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("חיפוש מטופל")}
            onClick={(e) => e.stopPropagation()}
            className="card mt-16 w-full max-w-md bg-[var(--color-surface)] shadow-2xl"
          >
            <div className="border-b border-line px-4 py-3">
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={t("חיפוש מטופל לפי שם…")}
                aria-label={t("חיפוש מטופל")}
                className="field w-full"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto py-1">
              {searching && <li className="px-4 py-3 text-sm text-muted">{t("מחפש…")}</li>}
              {!searching && q.trim().length >= 2 && results.length === 0 && (
                <li className="px-4 py-3 text-sm text-muted">{t("לא נמצאו מטופלים.")}</li>
              )}
              {results.map((r, i) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => go(r.id)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-start ${i === active ? "bg-[var(--hover-tint)]" : ""}`}
                  >
                    <span className="font-medium">{r.name}</span>
                    {(r.procedure || r.surgeryDate) && (
                      <span className="text-xs text-muted">
                        {r.procedure}
                        {r.procedure && r.surgeryDate ? " · " : ""}
                        {r.surgeryDate ? formatDate(r.surgeryDate, lang) : ""}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
