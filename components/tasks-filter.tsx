"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";

type Option = { key: string; label: string; count: number };
const hrefOf = (key: string) => (key === "all" ? "/clinic/tasks" : `/clinic/tasks?status=${key}`);

// Choosing a kind of task opens that view straight away. A dropdown on wide screens; tabs on a phone.
export function TasksFilter({ options, value, variant }: { options: Option[]; value: string; variant: "select" | "tabs" }) {
  const t = useT();
  const router = useRouter();
  const [tapped, setTapped] = useState<string | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const current = tapped ?? value;

  useEffect(() => { setTapped(null); }, [value]);
  // Keep the chosen tab in view when the strip is wider than the screen.
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [current]);

  if (variant === "select") {
    return (
      <select
        aria-label={t("סינון פעולות לפי סטטוס")} value={value} className="field min-h-11 w-auto min-w-0 max-w-full text-sm sm:min-h-9 sm:min-w-56 sm:py-1"
        onChange={(e) => router.push(hrefOf(e.target.value), { scroll: false })}
      >
        {options.map((o) => <option key={o.key} value={o.key}>{o.label} ({o.count})</option>)}
      </select>
    );
  }
  return (
    <div
      ref={strip} role="tablist" aria-label={t("סינון פעולות לפי סטטוס")}
      className="sticky top-14 z-10 -mx-4 flex gap-1 overflow-x-auto border-b border-line bg-[var(--color-page)]/90 px-4 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((o) => {
        const on = current === o.key;
        return (
          <Link
            key={o.key} href={hrefOf(o.key)} prefetch scroll={false} role="tab" aria-selected={on} onClick={() => setTapped(o.key)}
            className={`relative flex min-h-12 shrink-0 items-center gap-1.5 whitespace-nowrap px-3.5 text-[15px] ${on ? "font-semibold text-ink" : "text-muted"}`}
          >
            {o.label}
            <span className={`num grid min-w-5 place-items-center rounded-full px-1.5 text-xs font-semibold ${o.count === 0 ? "text-muted" : o.key === "review" ? "bg-warn-soft text-warn" : o.key === "rejected" || o.key === "overdue" ? "bg-bad-soft text-bad" : "bg-accent-soft text-accent"}`}>{o.count}</span>
            {on && <span aria-hidden className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />}
          </Link>
        );
      })}
    </div>
  );
}
