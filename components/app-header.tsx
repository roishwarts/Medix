"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { NavLink } from "@/components/nav-link";
import { AccessMenu } from "@/components/access-menu";
import { useT } from "@/components/i18n-provider";

export type NavItem = { href: string; label: string; exact?: boolean; badge?: React.ReactNode };

// Pages that have a sensible "up" even when nobody came from inside the app (a link opened directly).
const PARENT_OVERRIDES: Record<string, string> = { "/journey/tasks": "/journey", "/admin/clinics": "/admin" };
const parentOf = (path: string, home: string) => {
  const cut = path.replace(/\/[^/]+$/, "");
  const parent = PARENT_OVERRIDES[cut] ?? cut;
  return parent.startsWith(home) ? parent : home;
};

let pagesVisited = 0; // how many pages were opened inside the app, to know whether "back" can really go back

function BackButton({ home }: { home: string }) {
  const t = useT();
  const path = usePathname();
  const router = useRouter();
  useEffect(() => { pagesVisited += 1; }, [path]);
  if (path === home) return null;
  return (
    <button
      type="button" aria-label={t("חזרה")} title={t("חזרה")}
      className="btn btn-icon size-11 shrink-0"
      onClick={() => (pagesVisited > 1 ? router.back() : router.push(parentOf(path, home)))}
    >
      <span className="inline-flex -scale-x-100"><Icon name="arrow" size={18} /></span>
    </button>
  );
}

function MenuGlyph({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
    </svg>
  );
}

// The top bar of every signed-in area. Tabs on wide screens; a menu (hamburger) on phones.
export function AppHeader({
  items, brand, home, logout, languages = true, greeting, maxWidth = "max-w-6xl",
}: {
  items: NavItem[]; brand: string; home: string; logout: React.ReactNode; languages?: boolean; greeting?: string; maxWidth?: string;
}) {
  const t = useT();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open]);

  const active = (i: NavItem) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/"));

  return (
    <header className="topbar">
      <div className={`mx-auto flex ${maxWidth} items-center gap-1.5 px-3 py-1 sm:px-5`}>
        <button
          type="button" className="btn btn-icon btn-quiet size-11 shrink-0 md:hidden" aria-label={t("תפריט")} aria-expanded={open} aria-controls="side-menu"
          onClick={() => setOpen(true)}
        >
          <MenuGlyph open={false} />
        </button>

        <BackButton home={home} />

        {/* Tabs. They stay on the page (hidden on phones) so their pages keep loading in the background. */}
        <nav aria-label={t("ניווט ראשי")} className="hidden min-w-0 flex-1 gap-1 overflow-x-auto whitespace-nowrap md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((i) => <NavLink key={i.href} href={i.href} exact={i.exact}>{i.label}{i.badge}</NavLink>)}
        </nav>

        <div className="ms-auto flex min-w-0 items-center gap-1 md:ms-0">
          <span className="min-w-0 truncate px-1 text-sm text-muted">{brand}</span>
          <AccessMenu languages={languages} />
          <span className="hidden md:block">{logout}</span>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-label={t("תפריט")}>
          <button type="button" aria-label={t("סגירת התפריט")} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} tabIndex={-1} />
          <div ref={panel} id="side-menu" className="absolute inset-y-0 start-0 flex w-[min(20rem,85vw)] flex-col bg-[var(--color-page)] shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div className="min-w-0">
                {greeting && <p className="display truncate text-lg">{greeting}</p>}
                <p className="truncate text-sm text-muted">{brand}</p>
              </div>
              <button type="button" className="btn btn-icon btn-quiet size-11 shrink-0" aria-label={t("סגירת התפריט")} onClick={() => setOpen(false)}>
                <MenuGlyph open />
              </button>
            </div>
            <nav aria-label={t("ניווט ראשי")} className="flex-1 overflow-y-auto p-3">
              <ul className="space-y-1">
                {items.map((i) => (
                  <li key={i.href}>
                    <Link
                      href={i.href} prefetch={false} aria-current={active(i) ? "page" : undefined}
                      className={`flex min-h-12 items-center justify-between gap-3 rounded-2xl px-4 text-base transition-colors ${active(i) ? "glass-on font-medium text-ink" : "text-ink hover:bg-[var(--hover-tint)]"}`}
                    >
                      <span>{i.label}</span>
                      {i.badge}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="border-t border-line p-3">{logout}</div>
          </div>
        </div>
      )}
    </header>
  );
}
