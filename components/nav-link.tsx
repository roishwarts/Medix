"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";

// ---- instant tab highlight -------------------------------------------------------------------
// The tab that was just tapped, shown as active at once while the new page is still arriving.
let tapped: string | null = null;
const tapListeners = new Set<() => void>();
const setTapped = (href: string | null) => { tapped = href; tapListeners.forEach((l) => l()); };
const useTapped = () => useSyncExternalStore((cb) => { tapListeners.add(cb); return () => { tapListeners.delete(cb); }; }, () => tapped, () => null);

// ---- keeping the other tabs' pages ready -------------------------------------------------------
// Every tab loads its whole page ahead of time, so tapping it needs no waiting. Saving anything clears that
// stored copy, so the tabs are loaded again shortly after any save, after each page change, and when the app
// comes back to the foreground. There is no timer polling the server. Pages that are still fresh are not fetched twice.
const warmers = new Set<() => void>();
let warmTimer: ReturnType<typeof setTimeout> | undefined;

function warmSoon(delay = 400) {
  clearTimeout(warmTimer);
  warmTimer = setTimeout(() => warmers.forEach((w) => w()), delay);
}

if (typeof window !== "undefined" && !(window as unknown as { __tabsWarm?: boolean }).__tabsWarm) {
  (window as unknown as { __tabsWarm?: boolean }).__tabsWarm = true;
  document.addEventListener("visibilitychange", () => { if (!document.hidden) warmSoon(300); });
  // A save (a server action) just finished: its stored pages were cleared, so load the tabs again.
  const original = window.fetch;
  window.fetch = async (...args) => {
    const res = await original(...args);
    const init = args[1];
    const headers = new Headers(init?.headers ?? (args[0] instanceof Request ? args[0].headers : undefined));
    if (init?.method === "POST" && headers.has("next-action")) warmSoon(500);
    return res;
  };
}

export function NavLink({ href, exact, children }: { href: string; exact?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const pending = useTapped();
  const router = useRouter();
  // The page that is (or is about to be) shown decides which tab looks active.
  const current = pending ?? path;
  const active = exact ? current === href : current === href || current.startsWith(href + "/");
  const isCurrent = exact ? path === href : path === href || path.startsWith(href + "/");

  useEffect(() => { setTapped(null); warmSoon(); }, [path]);

  const currentRef = useRef(isCurrent);
  currentRef.current = isCurrent;
  useEffect(() => {
    const warm = () => { if (!currentRef.current) router.prefetch(href); };
    warmers.add(warm);
    return () => { warmers.delete(warm); };
  }, [href, router]);

  return (
    <Link
      href={href}
      // Fetch the whole page ahead of time (not just its outline) so opening the tab needs no waiting.
      prefetch
      onClick={() => setTapped(href)}
      aria-current={active ? "page" : undefined}
      className={`tab my-1.5 shrink-0 rounded-full px-2.5 py-1.5 text-[15px] sm:px-3.5 transition-colors ${active ? "tab-on" : ""}`}
    >
      {children}
    </Link>
  );
}
