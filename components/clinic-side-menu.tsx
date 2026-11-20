"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NavIcon } from "@/components/nav-icons";
import { Icon } from "@/components/ui";
import { AccessControls } from "@/components/access-menu";
import { OPEN_SETTINGS_EVENT } from "@/components/home-settings";
import { useT } from "@/components/i18n-provider";
import type { NavItem } from "@/components/app-header";

const A11Y_GLYPH = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="4.5" r="1.8" />
    <path d="M4.5 8.5c5 1.3 10 1.3 15 0M12 8v5.5m0 0-3.5 7m3.5-7 3.5 7" />
  </svg>
);

// The phone's side menu (opened from the hamburger in the top bar): every page that is not in the bottom bar,
// the accessibility and preferences panel, and - at the bottom - who is signed in, accessibility and sign out.
export function ClinicSideMenu({
  items, brand, logo, userName, roleLabel, logout,
}: {
  items: NavItem[]; brand: string; logo?: string | null; userName: string; roleLabel: string; logout: React.ReactNode;
}) {
  const t = useT();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // The page that was just tapped: it shows as chosen at once while the menu stays open until the page arrives.
  const [tapped, setTapped] = useState<string | null>(null);
  const [a11y, setA11y] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(false); setTapped(null); }, [path]);
  // Load the menu's pages ahead of time (the whole page, not just its outline), so opening one needs no waiting.
  // Pages that are still fresh are not fetched twice.
  const hrefs = items.map((i) => i.href).join("|");
  useEffect(() => {
    const warm = () => hrefs.split("|").forEach((h) => { if (h && h !== path) router.prefetch(h); });
    const id = setTimeout(warm, 1200);
    return () => clearTimeout(id);
  }, [hrefs, path, router]);
  useEffect(() => { if (open) hrefs.split("|").forEach((h) => { if (h && h !== path) router.prefetch(h); }); }, [open, hrefs, path, router]);
  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, openIt);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, openIt);
  }, []);
  useEffect(() => {
    if (!open) { setA11y(false); return; }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open]);

  // Always mounted (even while the menu is closed): these invisible links make the browser load each page ahead of time.
  const warmLinks = (
    <div className="sr-only" aria-hidden="true">
      {items.map((i) => <Link key={i.href} href={i.href} prefetch tabIndex={-1}>{i.label}</Link>)}
    </div>
  );
  if (!open) return warmLinks;
  const active = (i: NavItem) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/"));
  return (
    <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-label={t("תפריט")}>
      {warmLinks}
      <button type="button" aria-label={t("סגירה")} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} tabIndex={-1} />
      <div ref={panel} id="side-menu" className="absolute inset-y-0 start-0 flex w-[min(20rem,86vw)] flex-col bg-[var(--color-page)] shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex min-w-0 items-center gap-2">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={brand} className="brand-logo h-8 w-auto max-w-[10rem] shrink-0 object-contain" />
            ) : (
              <span className="truncate font-medium">{brand}</span>
            )}
          </div>
          <button type="button" className="btn btn-quiet btn-icon size-11 shrink-0" aria-label={t("סגירה")} onClick={() => setOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <nav aria-label={t("תפריט")} className="flex-1 overflow-y-auto p-3">
          {/* The two things a secretary reaches for from anywhere. */}
          <ul className="mb-3 space-y-1 border-b border-line pb-3">
            <li>
              <Link href="/clinic/patients/new" onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-2xl bg-accent-soft px-3 text-base font-medium text-accent">
                <Icon name="plus" size={20} /> <span>{t("מטופל חדש")}</span>
              </Link>
            </li>
            <li>
              <Link href="/clinic/patients?find=1" onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-base hover:bg-[var(--hover-tint)]">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden><circle cx="7" cy="7" r="4.5" /><path d="M13 13l-2.5-2.5" /></svg>
                <span>{t("חיפוש מטופל")}</span>
              </Link>
            </li>
          </ul>
          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} prefetch onClick={() => setTapped(i.href)} aria-current={active(i) ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 text-base ${active(i) || tapped === i.href ? "glass-on font-medium" : "hover:bg-[var(--hover-tint)]"}`}>
                  <NavIcon name={i.icon} /> <span>{i.label}</span>{i.badge}
                </Link>
              </li>
            ))}
          </ul>
          {a11y && (
            <section id="side-menu-a11y" aria-label={t("נגישות והעדפות")} className="mt-4 border-t border-line pt-4">
              <h2 className="display mb-3 text-base">{t("נגישות והעדפות")}</h2>
              <AccessControls languages />
            </section>
          )}
        </nav>

        <div className="space-y-2 border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3 px-1">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft font-semibold text-accent">{userName.trim().charAt(0)}</span>
            <div className="min-w-0">
              <p className="truncate font-medium">{userName}</p>
              <p className="truncate text-sm text-muted">{roleLabel}</p>
            </div>
          </div>
          <button type="button" aria-expanded={a11y} aria-controls="side-menu-a11y" onClick={() => setA11y((v) => !v)}
            className="btn min-h-11 w-full gap-2">
            {A11Y_GLYPH}{t("נגישות והגדרות")}
          </button>
          {logout}
        </div>
      </div>
    </div>
  );
}
