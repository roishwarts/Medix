"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NavIcon, type NavIconName } from "@/components/nav-icons";
import { NavLink } from "@/components/nav-link";
import { AccessMenu, AccessControls } from "@/components/access-menu";
import { useT } from "@/components/i18n-provider";

export type NavItem = { href: string; label: string; icon: NavIconName; exact?: boolean; badge?: React.ReactNode; more?: boolean };

// The top bar of every signed-in area: tabs on wide screens. On phones the navigation is a bar at the bottom
// of the screen, with a settings button that opens a sheet (more pages, accessibility, sign out).
export function AppHeader({
  items, brand, logo, logout, languages = true, greeting,
}: {
  items: NavItem[]; brand: string; logo?: string | null; logout: React.ReactNode; languages?: boolean; greeting?: string; home?: string; maxWidth?: string;
}) {
  const t = useT();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    sheet.current?.querySelector<HTMLElement>("button")?.focus();
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [open]);

  const active = (i: NavItem) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/"));
  const bar = items.filter((i) => !i.more);
  const more = items.filter((i) => i.more);

  return (
    <>
      <header className="topbar hidden md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-3 py-1 sm:px-5">
          {/* Tabs. They stay on the page (hidden on phones) so their pages keep loading in the background. */}
          <nav aria-label={t("ניווט ראשי")} className="hidden min-w-0 flex-1 gap-1 overflow-x-auto whitespace-nowrap md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((i) => <NavLink key={i.href} href={i.href} exact={i.exact}>{i.label}{i.badge}</NavLink>)}
          </nav>
          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-1 md:ms-0 md:flex-none">
            {logo && <img src={logo} alt="" className="size-6 shrink-0 rounded-md object-contain" />}
            <span className="min-w-0 truncate px-1 text-sm text-muted">{brand}</span>
            <span className="hidden md:block"><AccessMenu languages={languages} /></span>
            <span className="hidden md:block">{logout}</span>
          </div>
        </div>
      </header>

      {/* Phone navigation */}
      <nav aria-label={t("ניווט ראשי")} className="bottom-bar fixed inset-x-0 bottom-0 z-40 md:hidden">
        <ul className="mx-auto flex max-w-lg items-stretch justify-around">
          {bar.map((i) => (
            <li key={i.href} className="min-w-0 flex-1">
              <Link href={i.href} aria-current={active(i) ? "page" : undefined} className={`bar-item ${active(i) ? "bar-item-on" : ""}`}>
                <span className="relative"><NavIcon name={i.icon} />{i.badge && <span className="absolute -top-1.5 start-3 [&>span]:ms-0 [&>span]:scale-90">{i.badge}</span>}</span>
                <span className="max-w-full truncate">{i.label}</span>
              </Link>
            </li>
          ))}
          <li className="min-w-0 flex-1">
            <button type="button" className={`bar-item w-full ${open ? "bar-item-on" : ""}`} aria-expanded={open} aria-haspopup="dialog" aria-controls="settings-sheet" onClick={() => setOpen((v) => !v)}>
              <NavIcon name="settings" />
              <span className="max-w-full truncate">{t("הגדרות")}</span>
            </button>
          </li>
        </ul>
      </nav>

      {open && (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-label={t("הגדרות")}>
          <button type="button" aria-label={t("סגירה")} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} tabIndex={-1} />
          <div ref={sheet} id="settings-sheet" className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl bg-[var(--color-page)] shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                {logo && <img src={logo} alt="" className="size-8 shrink-0 rounded-md object-contain" />}
                <div className="min-w-0">
                  {greeting && <p className="display truncate text-lg">{greeting}</p>}
                  <p className="truncate text-sm text-muted">{brand}</p>
                </div>
              </div>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(false)}>{t("סגירה")}</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {more.length > 0 && (
                <ul className="mb-4 space-y-1">
                  {more.map((i) => (
                    <li key={i.href}>
                      <Link href={i.href} aria-current={active(i) ? "page" : undefined}
                        className={`flex min-h-12 items-center gap-3 rounded-2xl px-3 text-base ${active(i) ? "glass-on font-medium" : "hover:bg-[var(--hover-tint)]"}`}>
                        <NavIcon name={i.icon} /> <span>{i.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <section aria-label={t("נגישות והעדפות")} className={more.length > 0 ? "border-t border-line pt-4" : ""}>
                <h2 className="display mb-3 text-base">{t("נגישות והעדפות")}</h2>
                <AccessControls languages={languages} />
              </section>
            </div>
            <div className="border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{logout}</div>
          </div>
        </div>
      )}
    </>
  );
}
