"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import type { RangeKey } from "@/lib/insights";

const OPTIONS: [RangeKey, string][] = [
  ["3m", "3 חודשים"],
  ["6m", "6 חודשים"],
  ["12m", "12 חודשים"],
];

// A fixed 6-month window used to be the only option; this just swaps it for a short/medium/long
// pick, so a doctor can also see a full year's trend or narrow down to the current quarter.
export function InsightsRange({ value }: { value: RangeKey }) {
  const t = useT();
  const router = useRouter();
  return (
    <select
      aria-label={t("טווח התקופה")} value={value} className="field !min-h-9 w-auto py-1 text-sm"
      onChange={(e) => router.push(`/clinic/insights?range=${e.target.value}`, { scroll: false })}
    >
      {OPTIONS.map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}
    </select>
  );
}
