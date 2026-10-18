"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// A thin bar at the top that starts the moment an internal link is clicked and finishes when the new page shows.
function Bar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // New page arrived: finish the bar.
  useEffect(() => {
    setPhase((p) => (p === "loading" ? "done" : p));
    const t = setTimeout(() => setPhase("idle"), 350);
    return () => clearTimeout(t);
  }, [pathname, search]);

  // A click on an internal link: start the bar.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      setPhase("loading");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setPhase("idle"), 15000); // never get stuck
    }
    // Capture phase: runs before the link handler calls preventDefault for client-side navigation.
    document.addEventListener("click", onClick, true);
    return () => { document.removeEventListener("click", onClick, true); clearTimeout(timer.current); };
  }, []);

  if (phase === "idle") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[3px]" role="progressbar" aria-hidden>
      <div
        className="h-full bg-accent"
        style={{
          width: phase === "done" ? "100%" : "85%",
          transition: phase === "done" ? "width 0.2s ease-out, opacity 0.3s 0.15s" : "width 8s cubic-bezier(0.1, 0.6, 0.2, 1)",
          opacity: phase === "done" ? 0 : 1,
          marginInlineStart: 0,
        }}
      />
    </div>
  );
}

export function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
