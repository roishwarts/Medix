"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useT, useLang } from "@/components/i18n-provider";
import { ReadinessBar } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { STAGES, STAGE_LABEL, STAGE_PILL, isActiveStage, type Stage } from "@/lib/journey";
import { windowLabel } from "@/lib/windows";
import type { Readiness } from "@/lib/journey";

export type PatientRow = {
  id: string; name: string; surgeryDate: string; daysToSurgery: number; readiness: number; readinessState: Readiness;
  stage: Stage; hospital: string | null; company: string | null; step: string;
};
type StageFilter = Stage | "active" | "all";
const PRESETS = [7, 14, 21, 30, 60, 90];

// The patients table with its filters. Filtering happens on the page itself as the user types or chooses,
// and the address is updated so the filtered view can still be shared or reloaded.
export function PatientsList({ rows, hospitals, initial, title, action }: {
  title: string; action: React.ReactNode;
  rows: PatientRow[]; hospitals: string[]; initial: { q: string; hospital: string; days: number | null; stage: StageFilter };
}) {
  const t = useT();
  const lang = useLang();
  const [q, setQ] = useState(initial.q);
  const [hospital, setHospital] = useState(initial.hospital);
  const [days, setDays] = useState<number | null>(initial.days);
  const [custom, setCustom] = useState(initial.days !== null && !PRESETS.includes(initial.days));
  const [stage, setStage] = useState<StageFilter>(initial.stage);

  const sync = (next: { q?: string; hospital?: string; days?: number | null; stage?: StageFilter }) => {
    const v = { q, hospital, days, stage, ...next };
    const p = new URLSearchParams();
    if (v.q.trim()) p.set("q", v.q.trim());
    if (v.hospital) p.set("hospital", v.hospital);
    if (v.days) p.set("days", String(v.days));
    if (v.stage !== "active") p.set("stage", v.stage);
    const query = p.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };

  const inStage = (s: Stage, f: StageFilter) => (f === "all" ? true : f === "active" ? isActiveStage(s) : s === f);
  const base = useMemo(() => rows
    .filter((r) => (days ? r.daysToSurgery >= 0 && r.daysToSurgery <= days : true))
    .filter((r) => (hospital ? r.hospital === hospital : true))
    .filter((r) => (q.trim() ? r.name.toLowerCase().includes(q.trim().toLowerCase()) : true)), [rows, days, hospital, q]);
  const shown = base.filter((r) => inStage(r.stage, stage));
  const count = (f: StageFilter) => base.filter((r) => inStage(r.stage, f)).length;

  const sel = "field !min-h-9 w-auto max-w-[12rem] py-1 text-sm max-sm:max-w-none max-sm:flex-1";
  const stageOptions: [StageFilter, string][] = [["active", t("פעילים")], ...STAGES.map((s) => [s, t(STAGE_LABEL[s])] as [StageFilter, string]), ["all", t("הכול")]];

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h1 className="display order-1 text-4xl">{title}</h1>
      <div role="search" aria-label={t("סינון מטופלים")} className="order-3 flex min-w-0 basis-full flex-wrap items-center gap-2 md:order-2 md:flex-1 md:basis-0 md:justify-center">
        <input
          type="search" value={q} onChange={(e) => { setQ(e.target.value); sync({ q: e.target.value }); }}
          aria-label={t("חיפוש שם")} placeholder={t("חיפוש שם")} autoComplete="off" enterKeyHint="search"
          className="field !min-h-9 w-full py-1 text-sm sm:w-48"
        />
        <select aria-label={t("בית חולים")} className={sel} value={hospital} onChange={(e) => { setHospital(e.target.value); sync({ hospital: e.target.value }); }}>
          <option value="">{t("כל בתי החולים")}</option>
          {hospitals.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select
          aria-label={t("מועד הניתוח")} className={sel} value={custom ? "custom" : days ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "custom") { setCustom(true); return; }
            setCustom(false); const d = v ? Number(v) : null; setDays(d); sync({ days: d });
          }}
        >
          <option value="">{t("כל הניתוחים")}</option>
          {PRESETS.map((d) => <option key={d} value={d}>{windowLabel(d, t)}</option>)}
          <option value="custom">{t("מספר ימים אחר…")}</option>
        </select>
        {custom && (
          <input
            type="number" inputMode="numeric" min={1} max={3650} value={days ?? ""} aria-label={t("ניתוח בעוד (ימים)")} placeholder={t("ימים")}
            onChange={(e) => { const d = e.target.value ? Math.max(1, Math.floor(Number(e.target.value))) : null; setDays(d); sync({ days: d }); }}
            className="field num !min-h-9 w-24 py-1 text-sm"
          />
        )}
        <select aria-label={t("סטטוס המטופל")} className={sel} value={stage} onChange={(e) => { const s = e.target.value as StageFilter; setStage(s); sync({ stage: s }); }}>
          {stageOptions.map(([key, label]) => <option key={key} value={key}>{label} ({count(key)})</option>)}
        </select>
      </div>
        <div className="order-2 ms-auto md:order-3 md:ms-0">{action}</div>
      </div>

      <p className="sr-only" role="status">{t("מוצגים {n} מתוך {total} מטופלים", { n: shown.length, total: rows.length })}</p>
      <div className="card mt-5 overflow-x-auto">
        <table className="w-full text-start">
          <caption className="sr-only">{t("רשימת מטופלים")}</caption>
          <thead>
            <tr className="border-b border-line text-start text-sm text-muted">
              <th scope="col" className="px-2 py-3 min-[400px]:px-3 sm:px-4 text-start font-medium">{t("מטופל")}</th>
              <th scope="col" className="px-2 py-3 min-[400px]:px-3 sm:px-4 text-start font-medium">{t("ניתוח")}</th>
              <th scope="col" className="px-2 py-3 min-[400px]:px-3 sm:px-4 text-start font-medium">{t("מוכנות")}</th>
              <th scope="col" className="px-2 py-3 min-[400px]:px-3 sm:px-4 text-start font-medium">{t("סטטוס")}</th>
              <th scope="col" className="hidden px-4 py-3 text-start font-medium lg:table-cell">{t("בית חולים")}</th>
              <th scope="col" className="hidden px-4 py-3 text-start font-medium lg:table-cell">{t("חברה")}</th>
              <th scope="col" className="hidden px-4 py-3 text-start font-medium md:table-cell">{t("שלב נוכחי")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((r) => {
              const href = `/clinic/patients/${r.id}`;
              // Every cell is a link, so tapping anywhere on the row opens the patient.
              const link = "block px-2 py-3 min-[400px]:px-3 sm:px-4";
              return (
                <tr key={r.id} className="link-row">
                  <td className="min-w-[5.5rem]"><Link href={href} className={`${link} break-words font-medium`}>{r.name}</Link></td>
                  <td>
                    <Link href={href} tabIndex={-1} className={`${link} num whitespace-nowrap text-muted`}>
                      {formatDate(r.surgeryDate, lang)}
                      <span className="block whitespace-nowrap text-xs min-[400px]:ms-2 min-[400px]:inline">
                        {r.daysToSurgery >= 0 ? t("({n} ימים)", { n: r.daysToSurgery }) : t("(עבר)")}
                      </span>
                    </Link>
                  </td>
                  <td>
                    <Link href={href} tabIndex={-1} className={`${link} flex items-center gap-3`}>
                      <span className="num w-10 shrink-0 font-medium">{r.readiness}%</span>
                      <div className="hidden w-20 sm:block" aria-hidden="true"><ReadinessBar value={r.readiness} state={r.readinessState} /></div>
                    </Link>
                  </td>
                  <td><Link href={href} tabIndex={-1} className={link}><span className={`pill ${STAGE_PILL[r.stage]}`}>{t(STAGE_LABEL[r.stage])}</span></Link></td>
                  <td className="hidden lg:table-cell"><Link href={href} tabIndex={-1} className={`${link} text-sm text-muted`}>{r.hospital ?? "—"}</Link></td>
                  <td className="hidden lg:table-cell"><Link href={href} tabIndex={-1} className={`${link} text-sm text-muted`}>{r.company ?? "—"}</Link></td>
                  <td className="hidden md:table-cell"><Link href={href} tabIndex={-1} className={`${link} text-sm text-muted`}>{r.step}</Link></td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted">{t("אין מטופלים שמתאימים לסינון.")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
