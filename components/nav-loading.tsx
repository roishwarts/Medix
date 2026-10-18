"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// A small spinner that appears the moment an internal link is clicked and disappears when the new page shows.
function Bar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // New page arrived: hide the spinner.
  useEffect(() => {
    setLoading(false);
  }, [pathname, search]);

  // A click on an internal link: show the spinner right away.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setLoading(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setLoading(false), 15000); // never get stuck
    }
    // Capture phase: runs before the link handler calls preventDefault for client-side navigation.
    document.addEventListener("click", onClick, true);
    return () => { document.removeEventListener("click", onClick, true); clearTimeout(timer.current); };
  }, []);

  if (!loading) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center" role="status" aria-label="טוען">
      <span className="grid size-10 place-items-center rounded-full border border-line bg-surface shadow-md">
        <svg className="size-5 animate-spin text-accent motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}

export function NavLoading() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
