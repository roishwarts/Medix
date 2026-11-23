"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NavIcon } from "@/components/nav-icons";
import { NavLink } from "@/components/nav-link";
import { AccessControls } from "@/components/access-menu";
import { useT } from "@/components/i18n-provider";
import type { NavItem } from "@/components/app-header";
import { RAIL_COOKIE } from "@/lib/rail";


const SVG = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

// The staff area's side menu on wide screens: the clinic name and a collapse button on top, the pages in the
// middle, who is signed in at the bottom. It opens wide (icons and words) or narrow (icons only, with the page
// name shown on hover or focus). The choice is remembered in a cookie so the next page already has the right width.
export function ClinicSidebar({
  items, brand, logo, userName, roleLabel, logout, collapsed: initial, quick = true,
}: {
  items: NavItem[]; brand: string; logo?: string | null; userName: string; roleLabel: string; logout: React.ReactNode; collapsed: boolean;
  // The "new patient" and "search" entries are for the clinic team; the patient's menu leaves them out.
  quick?: boolean;
}) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(initial);
  const [a11y, setA11y] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!a11y) return;
    const onDown = (e: MouseEvent) => { if (panel.current && !panel.current.contains(e.target as Node)) setA11y(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setA11y(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [a11y]);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.querySelector<HTMLElement>(".clinic-shell")?.setAttribute("data-rail", next ? "0" : "1");
    try { document.cookie = `${RAIL_COOKIE}=${next ? "0" : "1"}; path=/; max-age=31536000; samesite=lax`; } catch { /* the choice just is not remembered */ }
  }

  const main = items.filter((i) => !i.more);
  const more = items.filter((i) => i.more);
  const row = (i: NavItem) => (
    <li key={i.href}>
      <NavLink href={i.href} exact={i.exact} variant="rail" tip={i.label} label={collapsed ? i.label : undefined}>
        <NavIcon name={i.icon} />
        <span className="rail-label">{i.label}</span>
        {i.badge && <span className="rail-badge">{i.badge}</span>}
      </NavLink>
    </li>
  );

  return (
    <aside className="rail max-md:hidden" aria-label={t("תפריט צד")}>
      <div className="rail-top">
        {/* The clinic's name (or its logo) with the collapse button. The button stays when the menu is narrow. */}
        <span className="rail-brand">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={brand} className="brand-logo h-8 w-auto max-w-[9.5rem] object-contain" />
          ) : (
            <span className="truncate text-[1.05rem] font-semibold">{brand}</span>
          )}
        </span>
        <button
          type="button" onClick={toggle} aria-expanded={!collapsed} aria-label={collapsed ? t("פתיחת התפריט") : t("סגירת התפריט")}
          data-tip={collapsed ? t("פתיחת התפריט") : t("סגירת התפריט")} className="rail-toggle"
        >
          <svg {...SVG} width={20} height={20}><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M9.5 4.5v15" /></svg>
        </button>
      </div>

      <nav aria-label={t("ניווט ראשי")} className="rail-nav">
        {quick && (
          <>
        <ul className="space-y-1">
          <li>
            <Link href="/clinic/patients/new" data-tip={t("מטופל חדש")} aria-label={collapsed ? t("מטופל חדש") : undefined} className="rail-item rail-item-new">
              <svg {...SVG}><path d="M12 5v14M5 12h14" /></svg>
              <span className="rail-label">{t("מטופל חדש")}</span>
            </Link>
          </li>
          <li>
            <Link href="/clinic/patients?find=1" data-tip={t("חיפוש מטופל")} aria-label={collapsed ? t("חיפוש מטופל") : undefined} className="rail-item">
              <svg {...SVG}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
              <span className="rail-label">{t("חיפוש מטופל")}</span>
            </Link>
          </li>
        </ul>
        <hr className="rail-rule" />
          </>
        )}
        <ul className="space-y-1">{main.map(row)}</ul>
        {more.length > 0 && (
          <>
            <hr className="rail-rule" />
            <ul className="space-y-1">{more.map(row)}</ul>
          </>
        )}
      </nav>

      <div className="rail-foot">
        <hr className="rail-rule" />
        <div className="rail-user" data-tip={`${userName} · ${roleLabel}`}>
          <span aria-hidden className="rail-avatar">{userName.trim().charAt(0)}</span>
          <span className="rail-label min-w-0">
            <span className="block truncate text-[0.95rem] font-medium">{userName}</span>
            <span className="block truncate text-sm text-muted">{roleLabel}</span>
          </span>
        </div>
        <div ref={panel} className="relative">
          <button type="button" aria-expanded={a11y} aria-haspopup="dialog" data-tip={t("נגישות והעדפות")} aria-label={t("נגישות והעדפות")} onClick={() => setA11y((v) => !v)} className="rail-item w-full">
            <svg {...SVG}><circle cx="12" cy="4.5" r="1.8" /><path d="M4.5 8.5c5 1.3 10 1.3 15 0M12 8v5.5m0 0-3.5 7m3.5-7 3.5 7" /></svg>
            <span className="rail-label">{t("נגישות והעדפות")}</span>
          </button>
          {a11y && (
            <div role="dialog" aria-label={t("נגישות והעדפות")} className="card absolute bottom-0 z-[70] max-h-[80dvh] w-80 overflow-y-auto bg-[var(--color-surface)] p-4 shadow-2xl [inset-inline-start:calc(100%+0.75rem)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="display text-lg">{t("נגישות והעדפות")}</h2>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => setA11y(false)}>{t("סגירה")}</button>
              </div>
              <AccessControls languages />
            </div>
          )}
        </div>
        {logout}
      </div>
    </aside>
  );
}
