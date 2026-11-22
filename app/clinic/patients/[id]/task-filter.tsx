"use client";

import { useState } from "react";

export type TaskFilterChip = { key: string; label: string; count: number; tone: "warn" | "bad" | null };

// The status chips above a patient's timeline. Choosing one only hides the tasks that do not match (the page
// already holds all of them), so it answers at once instead of asking the server for the page again.
// The choice is also written into the address (without reloading), so a link or a refresh keeps it.
export function TaskFilter({ chips, initial, navLabel, emptyText, children }: {
  chips: TaskFilterChip[]; initial: string; navLabel: string; emptyText: string; children: React.ReactNode;
}) {
  const [active, setActive] = useState(initial);
  const empty = (chips.find((c) => c.key === active)?.count ?? 0) === 0;

  function choose(key: string) {
    setActive(key);
    try {
      const url = new URL(window.location.href);
      if (key === "all") url.searchParams.delete("status"); else url.searchParams.set("status", key);
      window.history.replaceState(window.history.state, "", url);
    } catch { /* the address just is not updated */ }
  }

  return (
    <div className="tfilter" data-f={active}>
      <nav aria-label={navLabel} className="chip-row">
        {chips.map((c) => (
          <button key={c.key} type="button" onClick={() => choose(c.key)} aria-current={c.key === active ? "true" : undefined} className="chip min-h-11">
            {c.label}{" "}
            <span className={`num text-xs ${c.tone === "warn" ? "font-semibold text-warn" : c.tone === "bad" ? "font-semibold text-bad" : ""}`}>{c.count}</span>
          </button>
        ))}
      </nav>
      {empty && <p className="mt-3 px-1 py-10 text-center text-muted">{emptyText}</p>}
      {children}
    </div>
  );
}
