"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";

// Choosing a kind of task opens that view straight away.
export function TasksFilter({ options, value }: { options: { key: string; label: string; count: number }[]; value: string }) {
  const t = useT();
  const router = useRouter();
  return (
    <select
      aria-label={t("סינון פעולות לפי סטטוס")} value={value} className="field min-h-11 w-auto min-w-0 max-w-full text-sm sm:min-h-9 sm:min-w-56 sm:py-1"
      onChange={(e) => router.push(e.target.value === "all" ? "/clinic/tasks" : `/clinic/tasks?status=${e.target.value}`, { scroll: false })}
    >
      {options.map((o) => <option key={o.key} value={o.key}>{o.label} ({o.count})</option>)}
    </select>
  );
}
