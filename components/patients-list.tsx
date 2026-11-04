"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useT, useLang } from "@/components/i18n-provider";
import { Icon, ReadinessBar } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { STAGES, STAGE_LABEL, STAGE_PILL, isActiveStage, type Stage } from "@/lib/journey";
import type { Readiness } from "@/lib/journey";

export type PatientRow = {
  id: string; name: string; procedure: string | null; surgeryDate: string; daysToSurgery: number; readiness: number; readinessState: Readiness;
  stage: Stage; hospital: string | null; company: string | null; step: string; procedureLabel: string;
};
type StageFilter = Stage | "active" | "all";
type SortKey = "name" | "surgery" | "readiness";

// The patients table with its filters. Filtering happens on the page itself as the user types or chooses,
// and the address is updated so the filtered view can still be shared or reloaded.
export function PatientsList({ rows, hospitals, procedures, initial, title, action }: {
  title: string; action: React.ReactNode;
  rows: PatientRow[]; hospitals: string[]; procedures: string[];
  initial: { q: string; hospital: string; procedure: string; days: number | null; stage: StageFilter };
}) {
  const t = useT();
  const lang = useLang();
  const [q, setQ] = useState(initial.q);
  const [searchOpen, setSearchOpen] = useState(!!initial.q);
  const [hospital, setHospital] = useState(initial.hospital);
  const [procedure, setProcedure] = useState(initial.procedure);
  const [stage, setStage] = useState<StageFilter>(initial.stage);
  // Set by the dashboard numbers ("surgeries in the next N days"); shown as a removable chip, no extra control.
  const [days, setDays] = useState<number | null>(initial.days);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);

  // Clicking a sortable header cycles ascending → descending → back to the default (surgery-date) order.
  const toggleSort = (key: SortKey) =>
    setSort((s) => (s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }));
  const sortIndicator = (key: SortKey) => sort?.key === key && <Icon name={sort.dir === 1 ? "up" : "down"} size={12} />;
  const ariaSort = (key: SortKey): React.AriaAttributes["aria-sort"] =>
    sort?.key !== key ? "none" : sort.dir === 1 ? "ascending" : "descending";

  const sync = (next: Partial<{ q: string; hospital: string; procedure: string; days: number | null; stage: StageFilter }>) => {
    const v = { q, hospital, procedure, days, stage, ...next };
    const p = new URLSearchParams();
    if (v.q.trim()) p.set("q", v.q.trim());
    if (v.hospital) p.set("hospital", v.hospital);
    if (v.procedure) p.set("procedure", v.procedure);
    if (v.days) p.set("days", String(v.days));
    if (v.stage !== "active") p.set("stage", v.stage);
    const query = p.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };

  const inStage = (s: Stage, f: StageFilter) => (f === "all" ? true : f === "active" ? isActiveStage(s) : s === f);
  const base = useMemo(() => rows
    .filter((r) => (hospital ? r.hospital === hospital : true))
    .filter((r) => (procedure ? r.procedureLabel === procedure : true))
    .filter((r) => (days ? r.daysToSurgery >= 0 && r.daysToSurgery <= days : true))
    .filter((r) => (q.trim() ? r.name.toLowerCase().includes(q.trim().toLowerCase()) : true)), [rows, hospital, procedure, days, q]);
  const shown = base.filter((r) => inStage(r.stage, stage));
  const count = (f: StageFilter) => base.filter((r) => inStage(r.stage, f)).length;

  const sorted = useMemo(() => {
    if (!sort) return shown;
    const cmp: (a: PatientRow, b: PatientRow) => number =
      sort.key === "name" ? (a, b) => a.name.localeCompare(b.name, "he")
      : sort.key === "surgery" ? (a, b) => (a.surgeryDate < b.surgeryDate ? -1 : a.surgeryDate > b.surgeryDate ? 1 : 0)
      : (a, b) => a.readiness - b.readiness;
    return [...shown].sort((a, b) => cmp(a, b) * sort.dir);
  }, [shown, sort]);

  const sel = "field !min-h-11 w-full text-sm sm:!min-h-10 sm:w-auto sm:max-w-[13rem]";
  const stageOptions: [StageFilter, string][] = [["active", t("פעילים")], ...STAGES.map((s) => [s, t(STAGE_LABEL[s])] as [StageFilter, string]), ["all", t("הכול")]];
  const hasFilters = !!q.trim() || !!hospital || !!procedure || stage !== "active" || !!days || !!sort;
  const clear = () => {
    setQ(""); setHospital(""); setProcedure(""); setDays(null); setStage("active"); setSort(null);
    setSearchOpen(false);
    window.history.replaceState(null, "", window.location.pathname);
  };

  return (
    <>
      {/* One row: the title, then search and "new patient" together at the end. */}
      <div className="flex items-center gap-2">
        <h1 className="display min-w-0 flex-1 text-3xl sm:text-4xl">{title}</h1>
        <button
          type="button" aria-label={t("חיפוש מטופל")} aria-expanded={searchOpen} title={t("חיפוש מטופל")}
          onClick={() => setSearchOpen((o) => !o)}
          className={`btn min-h-11 min-w-11 !px-3 ${searchOpen || q.trim() ? "btn-primary" : ""}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" />
          </svg>
        </button>
        {action}
      </div>
      {searchOpen && (
        <div className="mt-3 flex items-center gap-2" role="search">
          <input
            autoFocus type="search" value={q} onChange={(e) => { setQ(e.target.value); sync({ q: e.target.value }); }}
            aria-label={t("חיפוש שם")} placeholder={t("חיפוש שם")} autoComplete="off" enterKeyHint="search" className="field min-w-0 flex-1"
          />
          <button type="button" className="btn btn-quiet min-h-11" onClick={() => { setQ(""); sync({ q: "" }); setSearchOpen(false); }}>{t("סגירה")}</button>
        </div>
      )}

      {/* The filters: hospital, procedure, status — and on a phone the sort too, so they sit two by two. */}
      <div role="group" aria-label={t("סינון מטופלים")} className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <select aria-label={t("בית חולים")} className={sel} value={hospital} onChange={(e) => { setHospital(e.target.value); sync({ hospital: e.target.value }); }}>
          <option value="">{t("כל בתי החולים")}</option>
          {hospitals.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select aria-label={t("הליך")} className={sel} value={procedure} onChange={(e) => { setProcedure(e.target.value); sync({ procedure: e.target.value }); }}>
          <option value="">{t("כל ההליכים")}</option>
          {procedures.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select aria-label={t("סטטוס המטופל")} className={sel} value={stage} onChange={(e) => { const s = e.target.value as StageFilter; setStage(s); sync({ stage: s }); }}>
          {stageOptions.map(([key, label]) => <option key={key} value={key}>{label} ({count(key)})</option>)}
        </select>
        <select
          aria-label={t("מיון")} className={`${sel} sm:hidden`}
          value={sort ? `${sort.key}:${sort.dir}` : ""}
          onChange={(e) => {
            const v = e.target.value;
            setSort(v ? { key: v.split(":")[0] as SortKey, dir: Number(v.split(":")[1]) as 1 | -1 } : null);
          }}
        >
          <option value="">{t("לפי תאריך ניתוח")}</option>
          <option value="name:1">{t("שם (א-ת)")}</option>
          <option value="readiness:1">{t("מוכנות (נמוך לגבוה)")}</option>
          <option value="readiness:-1">{t("מוכנות (גבוה לנמוך)")}</option>
        </select>
        {hasFilters && (
          <button type="button" onClick={clear} className="btn btn-quiet col-span-2 min-h-11 text-sm sm:col-span-1 sm:min-h-10">{t("ניקוי סינון")}</button>
        )}
      </div>
      <p className="sr-only" role="status">{t("מוצגים {n} מתוך {total} מטופלים", { n: shown.length, total: rows.length })}</p>

      {/* A phone screen can't fit the table's extra columns even hidden behind a scrollbar, so it
          gets its own compact card per patient with every field visible, instead of a table that
          quietly drops hospital/company/current-step until the screen is wider. The table's
          sortable headers aren't shown here, so the same sort state is a select in the filters above. */}
      <div className="mt-4 space-y-2 sm:hidden">
        {sorted.map((r) => (
          <Link key={r.id} href={`/clinic/patients/${r.id}`} className="card block min-h-11 p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 break-words font-medium">{r.name}</span>
              <span className={`pill ${STAGE_PILL[r.stage]} shrink-0`}>{t(STAGE_LABEL[r.stage])}</span>
            </div>
            {r.procedure && <p className="mt-0.5 text-sm text-muted">{r.procedure}</p>}
            <div className="mt-2.5 flex items-center gap-3">
              <span className="num shrink-0 text-sm text-muted">
                {formatDate(r.surgeryDate, lang)} · {r.daysToSurgery >= 0 ? t("({n} ימים)", { n: r.daysToSurgery }) : t("(עבר)")}
              </span>
              <span className="num shrink-0 text-sm font-medium">{r.readiness}%</span>
              <div className="min-w-0 flex-1" aria-hidden="true"><ReadinessBar value={r.readiness} state={r.readinessState} /></div>
            </div>
            <p className="mt-2 border-t border-line pt-2 text-sm">{r.step}</p>
            {(r.hospital || r.company) && (
              <p className="mt-1 text-xs text-muted">
                {[r.hospital, r.company].filter(Boolean).join(" · ")}
              </p>
            )}
          </Link>
        ))}
        {shown.length === 0 && <p className="card px-4 py-10 text-center text-muted">{t("אין מטופלים שמתאימים לסינון.")}</p>}
      </div>

      <div className="card mt-5 hidden overflow-x-auto sm:block">
        <table className="w-full text-start">
          <caption className="sr-only">{t("רשימת מטופלים")}</caption>
          <thead>
            <tr className="border-b border-line text-start text-sm text-muted">
              <th scope="col" aria-sort={ariaSort("name")} className="px-2 py-3 min-[400px]:px-3 sm:px-4 text-start font-medium">
                <button type="button" onClick={() => toggleSort("name")} className="inline-flex min-h-11 items-center gap-1 hover:text-ink sm:min-h-0">{t("מטופל")} {sortIndicator("name")}</button>
              </th>
              <th scope="col" aria-sort={ariaSort("surgery")} className="px-2 py-3 min-[400px]:px-3 sm:px-4 text-start font-medium">
                <button type="button" onClick={() => toggleSort("surgery")} className="inline-flex min-h-11 items-center gap-1 hover:text-ink sm:min-h-0">{t("ניתוח")} {sortIndicator("surgery")}</button>
              </th>
              <th scope="col" aria-sort={ariaSort("readiness")} className="px-2 py-3 min-[400px]:px-3 sm:px-4 text-start font-medium">
                <button type="button" onClick={() => toggleSort("readiness")} className="inline-flex min-h-11 items-center gap-1 hover:text-ink sm:min-h-0">{t("מוכנות")} {sortIndicator("readiness")}</button>
              </th>
              <th scope="col" className="px-2 py-3 min-[400px]:px-3 sm:px-4 text-start font-medium">{t("סטטוס")}</th>
              <th scope="col" className="hidden px-4 py-3 text-start font-medium md:table-cell">{t("בית חולים")}</th>
              <th scope="col" className="hidden px-4 py-3 text-start font-medium md:table-cell">{t("חברה")}</th>
              <th scope="col" className="hidden px-4 py-3 text-start font-medium md:table-cell">{t("שלב נוכחי")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sorted.map((r) => {
              const href = `/clinic/patients/${r.id}`;
              // Every cell is a link, so tapping anywhere on the row opens the patient.
              const link = "block px-2 py-3 min-[400px]:px-3 sm:px-4";
              return (
                <tr key={r.id} className="link-row">
                  <td className="min-w-[5.5rem]">
                    <Link href={href} className={`${link} break-words`}>
                      <span className="font-medium">{r.name}</span>
                      {r.procedure && <span className="block text-xs text-muted">{r.procedure}</span>}
                    </Link>
                  </td>
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
                  <td className="hidden md:table-cell"><Link href={href} tabIndex={-1} className={`${link} text-sm text-muted`}>{r.hospital ?? "—"}</Link></td>
                  <td className="hidden md:table-cell"><Link href={href} tabIndex={-1} className={`${link} text-sm text-muted`}>{r.company ?? "—"}</Link></td>
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
