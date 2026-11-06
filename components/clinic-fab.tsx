"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { Icon } from "@/components/ui";

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M13 13l-2.5-2.5" />
    </svg>
  );
}

// A raised quick-action button floating above the bottom tab bar on phones, opening a short choice
// sheet instead of jumping straight to one action - the two things a secretary reaches for from
// anywhere in the app, not tied to whatever page they happen to be on.
export function ClinicFab() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("פעולה מהירה")}
        aria-haspopup="dialog"
        className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-40 mx-auto grid size-14 place-items-center rounded-full bg-[var(--color-accent)] text-white shadow-[0_10px_24px_-8px_rgb(0_0_0/0.4)] transition active:scale-95 md:hidden"
      >
        <Icon name="plus" size={26} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/40 md:hidden" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("פעולה מהירה")}
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-md space-y-2 rounded-b-none bg-[var(--color-surface)] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl"
          >
            <button
              type="button"
              className="btn w-full min-h-12 justify-start gap-3"
              onClick={() => { setOpen(false); router.push("/clinic/patients/new"); }}
            >
              <Icon name="plus" size={18} /> {t("מטופל חדש")}
            </button>
            <button
              type="button"
              className="btn w-full min-h-12 justify-start gap-3"
              onClick={() => { setOpen(false); router.push("/clinic/patients"); }}
            >
              <SearchIcon /> {t("חיפוש מטופל")}
            </button>
            <button type="button" className="btn btn-quiet w-full min-h-12" onClick={() => setOpen(false)}>{t("ביטול")}</button>
          </div>
        </div>
      )}
    </>
  );
}
