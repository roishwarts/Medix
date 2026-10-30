import Link from "next/link";
import type { T } from "@/lib/i18n";

export const DAY_PRESETS = [7, 14, 21, 30, 60, 90];

// Hospital + "surgery within N days" filter, shared by the dashboard and the patients list.
// The number box accepts any value, so a secretary can use a time frame that is not in the presets.
export function PatientFilters({
  action, hospitals, hospital, days, hidden = {}, t, children, compact = false,
}: {
  action: string; hospitals: string[]; hospital?: string; days?: number | null;
  hidden?: Record<string, string | undefined>; t: T; children?: React.ReactNode; compact?: boolean;
}) {
  const link = (d: number | null) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(hidden)) if (v) p.set(k, v);
    if (hospital) p.set("hospital", hospital);
    if (d) p.set("days", String(d));
    const q = p.toString();
    return q ? `${action}?${q}` : action;
  };
  const presets = days && !DAY_PRESETS.includes(days) ? [...DAY_PRESETS, days].sort((a, b) => a - b) : DAY_PRESETS;
  if (compact) {
    // One slim line: no card, no chips, labels only for screen readers.
    return (
      <form action={action} role="search" aria-label={t("סינון מטופלים")} className="flex flex-wrap items-center gap-2">
        {Object.entries(hidden).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
        <select name="hospital" aria-label={t("בית חולים")} defaultValue={hospital ?? ""} className="field !min-h-9 w-auto max-w-[11rem] py-1 text-sm">
          <option value="">{t("כל בתי החולים")}</option>
          {hospitals.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <input name="days" type="number" inputMode="numeric" min={1} max={3650} list="day-presets" aria-label={t("ניתוח בתוך (ימים)")}
          defaultValue={days ?? ""} placeholder={t("כל הניתוחים")} className="field num !min-h-9 w-32 py-1 text-sm" />
        <datalist id="day-presets">{DAY_PRESETS.map((d) => <option key={d} value={d} />)}</datalist>
        <button className="btn btn-sm !min-h-9">{t("סינון")}</button>
        {(hospital || days) && <Link href={action} className="btn btn-quiet btn-sm !min-h-9">{t("ניקוי")}</Link>}
      </form>
    );
  }
  return (
    <div className="space-y-3">
      <form action={action} role="search" aria-label={t("סינון מטופלים")} className="card flex flex-wrap items-end gap-x-4 gap-y-2 p-4">
        {Object.entries(hidden).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
        {children}
        <div className="min-w-40 flex-1 sm:flex-none">
          <label htmlFor="hospital" className="lbl">{t("בית חולים")}</label>
          <select id="hospital" name="hospital" defaultValue={hospital ?? ""} className="field w-full">
            <option value="">{t("כל בתי החולים")}</option>
            {hospitals.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div className="w-40">
          <label htmlFor="days" className="lbl">{t("ניתוח בתוך (ימים)")}</label>
          <input id="days" name="days" type="number" inputMode="numeric" min={1} max={3650} list="day-presets"
            defaultValue={days ?? ""} placeholder={t("כל הניתוחים")} className="field num" />
          <datalist id="day-presets">{DAY_PRESETS.map((d) => <option key={d} value={d} />)}</datalist>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary">{t("סינון")}</button>
          <Link href={hidden && Object.values(hidden).some(Boolean) ? action + "?" + new URLSearchParams(Object.entries(hidden).filter(([, v]) => v) as [string, string][]).toString() : action} className="btn btn-quiet">{t("ניקוי")}</Link>
        </div>
      </form>
      <nav aria-label={t("מועד הניתוח")} className="chip-row flex-wrap">
        <Link href={link(null)} scroll={false} aria-current={!days ? "page" : undefined} className="chip min-h-11">{t("כל הניתוחים")}</Link>
        {presets.map((d) => (
          <Link key={d} href={link(d)} scroll={false} aria-current={days === d ? "page" : undefined} className="chip min-h-11">{t("{n} ימים", { n: d })}</Link>
        ))}
      </nav>
    </div>
  );
}

export function parseDays(v?: string): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 && n <= 3650 ? Math.floor(n) : null;
}
