"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { windowLabel } from "@/lib/windows";
import { useT } from "@/components/i18n-provider";

const OPTIONS = [7, 14, 21, 30, 60, 90];
const color = { bad: "text-bad", warn: "text-warn", ok: "text-ok", none: "text-ink" } as const;

// A dashboard number whose time frame (surgeries within N days) is picked on the card itself.
export function KpiWindow({ label, value, href, param, days, tone = "none" }: {
  label: string; value: string; href: string; param: string; days: number; tone?: keyof typeof color;
}) {
  const t = useT();
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();
  const options = OPTIONS.includes(days) ? OPTIONS : [...OPTIONS, days].sort((a, b) => a - b);
  return (
    <div className="card min-h-28 p-4">
      <p className="text-sm text-muted">{label}</p>
      <Link href={href} className={`display num mt-1 block text-4xl ${color[tone]}`}>{value}</Link>
      <select
        aria-label={label} value={days} className="field !min-h-9 mt-2 w-auto py-1 text-sm"
        onChange={(e) => {
          const p = new URLSearchParams(search.toString());
          p.set(param, e.target.value);
          router.push(`${path}?${p.toString()}`, { scroll: false });
        }}
      >
        {options.map((d) => <option key={d} value={d}>{windowLabel(d, t)}</option>)}
      </select>
    </div>
  );
}
