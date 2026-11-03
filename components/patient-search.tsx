"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { searchPatients, type PatientHit } from "@/app/clinic/search-actions";

// A search icon at the top of every staff page on a phone. It opens a full-screen search: type a name,
// phone or ID number and tap the patient to open their card.
export function PatientSearch() {
  const t = useT();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PatientHit[] | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open]);

  // Search as you type, after a short pause. A late answer to an older query is ignored.
  useEffect(() => {
    if (q.trim().length < 2) { setHits(null); return; }
    let stale = false;
    const id = setTimeout(async () => {
      const res = await searchPatients(q);
      if (!stale) setHits(res);
    }, 250);
    return () => { stale = true; clearTimeout(id); };
  }, [q]);

  return (
    <>
      <button type="button" className="btn btn-quiet min-h-11 min-w-11 !px-3" aria-label={t("חיפוש מטופל")} onClick={() => setOpen(true)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" />
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-[var(--color-page)]" role="dialog" aria-modal="true" aria-label={t("חיפוש מטופל")}>
          <div className="flex items-center gap-2 border-b border-line p-3">
            <input
              ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} className="field min-w-0 flex-1"
              placeholder={t("שם, טלפון או תעודת זהות")} aria-label={t("חיפוש מטופל")} autoComplete="off" enterKeyHint="search"
            />
            <button type="button" className="btn btn-quiet min-h-11" onClick={() => setOpen(false)}>{t("סגירה")}</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {hits === null && <p className="px-1 py-6 text-center text-sm text-muted">{t("הקלידו לפחות שתי אותיות")}</p>}
            {hits !== null && hits.length === 0 && <p className="px-1 py-6 text-center text-sm text-muted">{t("לא נמצאו מטופלים")}</p>}
            {hits !== null && hits.length > 0 && (
              <ul className="card divide-y divide-line">
                {hits.map((h) => (
                  <li key={h.id}>
                    <Link href={`/clinic/patients/${h.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 active:bg-accent-soft">
                      <span className="min-w-0 truncate font-medium">{h.name}</span>
                      {h.phone && <span dir="ltr" className="num shrink-0 text-sm text-muted">{h.phone}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
