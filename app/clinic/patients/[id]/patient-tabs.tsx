"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";

export type TabDef = { id: string; label: string; badge?: number | null; badgeTone?: "bad" | "accent" };

// The patient card's three tabs (tasks, patient details, clinical). Every panel is rendered once by the server and
// the tabs only show and hide them, so switching is instant. The chosen tab is kept in the address (?tab=), and a
// link to a part of a hidden tab (#referrals, #doctor-questions...) opens that tab first.
export function PatientTabs({ tabs, initial, panels }: { tabs: TabDef[]; initial: string; panels: Record<string, React.ReactNode> }) {
  const t = useT();
  const [active, setActive] = useState(tabs.some((x) => x.id === initial) ? initial : tabs[0].id);
  const root = useRef<HTMLDivElement>(null);

  function select(id: string) {
    setActive(id);
    const url = new URL(window.location.href);
    if (id === tabs[0].id) url.searchParams.delete("tab"); else url.searchParams.set("tab", id);
    url.hash = "";
    window.history.replaceState(null, "", url.pathname + url.search);
  }

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    const panel = el?.closest<HTMLElement>("[data-tab-panel]");
    if (panel?.dataset.tabPanel) {
      setActive(panel.dataset.tabPanel);
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }), 50);
    }
  }, []);

  function onKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    // In a right-to-left page the right arrow goes to the previous tab.
    const dir = (document.documentElement.dir === "rtl" ? -1 : 1) * (e.key === "ArrowRight" ? 1 : -1);
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    select(next.id);
    root.current?.querySelector<HTMLElement>(`#tab-${next.id}`)?.focus();
  }

  return (
    <div ref={root}>
      <div role="tablist" aria-label={t("פרטי המטופל")} className="sticky top-14 z-10 -mx-4 flex gap-1 border-b border-line bg-[var(--color-page)]/90 px-4 backdrop-blur-xl sm:-mx-5 sm:px-5 md:top-14">
        {tabs.map((x, i) => (
          <button
            key={x.id} id={`tab-${x.id}`} type="button" role="tab" aria-selected={active === x.id} aria-controls={`panel-${x.id}`}
            tabIndex={active === x.id ? 0 : -1}
            onClick={() => select(x.id)} onKeyDown={(e) => onKey(e, i)}
            className={`relative flex min-h-12 flex-1 items-center justify-center gap-2 px-3 text-[15px] transition-colors sm:flex-none sm:px-6 ${active === x.id ? "font-semibold text-ink" : "text-muted hover:text-ink"}`}
          >
            {x.label}
            {x.badge ? (
              <span className={`num grid min-w-5 place-items-center rounded-full px-1.5 text-xs font-semibold ${x.badgeTone === "bad" ? "bg-bad-soft text-bad" : "bg-accent-soft text-accent"}`}>{x.badge}</span>
            ) : null}
            {active === x.id && <span aria-hidden className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />}
          </button>
        ))}
      </div>
      {tabs.map((x) => (
        <div key={x.id} id={`panel-${x.id}`} role="tabpanel" aria-labelledby={`tab-${x.id}`} data-tab-panel={x.id} hidden={active !== x.id} className="pt-6">
          {panels[x.id]}
        </div>
      ))}
    </div>
  );
}
