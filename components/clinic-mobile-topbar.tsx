"use client";

import Link from "next/link";
import { useT } from "@/components/i18n-provider";
import { OPEN_SETTINGS_EVENT } from "@/components/home-settings";

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <circle cx="7" cy="7" r="4.5" />
      <path d="M13 13l-2.5-2.5" />
    </svg>
  );
}

// A persistent header on phones, reachable from every /clinic page - previously there was no top
// chrome at all on mobile (only the bottom tab bar), so settings and quick search were only
// reachable from the dashboard's own one-off button, or not at all elsewhere.
export function ClinicMobileTopbar({ brand, logo }: { brand: string; logo: string | null }) {
  const t = useT();
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex min-h-14 items-center justify-between gap-2 border-b border-line bg-[var(--color-page)]/90 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:hidden">
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button" aria-label={t("תפריט")} aria-haspopup="dialog" aria-controls="side-menu" className="btn btn-quiet btn-icon size-11 shrink-0"
          onClick={() => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT))}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={brand} className="brand-logo h-7 w-auto max-w-[8rem] shrink-0 object-contain" />
        ) : (
          <span className="truncate text-sm font-medium">{brand}</span>
        )}
      </div>
      <Link
        href="/clinic/patients" aria-label={t("חיפוש מטופל")} className="btn btn-quiet btn-icon size-11 shrink-0"
      >
        <SearchIcon />
      </Link>
    </header>
  );
}
