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
  id: string; name: string; procedure: string | null; surgeryDate: string; daysToSurgery: number; readiness: number; readinessState: Readiness;
  stage: Stage; hospital: string | null; company: string | null; step: string; procedureLabel: string;
};
type StageFilter = Stage | "active" | "all";
type ReadyFilter = "all" | Readiness;
type SortKey = "date" | "readiness" | "name";
const PRESETS = [7, 14, 21, 30, 60, 90];

// The patients table with its filters. Filtering happens on the page itself as the user types or chooses,
// and the address is updated so the filtered view can still be shared or reloaded.
export function PatientsList({ rows, hospitals, procedures, initial, title, action }: {
  title: string; action: React.ReactNode;
  rows: PatientRow[]; hospitals: string[]; procedures: string[];
  initial: { q: string; hospital: string; procedure: string; days: number | null; stage: StageFilter; ready: ReadyFilter; sort: SortKey };
}) {
  const t = useT();
  const lang = useLang();
  const [q, setQ] = useState(initial.q);
  const [searchOpen, setSearchOpen] = useState(!!initial.q);
  const [hospital, setHospital] = useState(initial.hospital);
  const [procedure, setProcedure] = useState(initial.procedure);
  const [days, setDays] = useState<number | null>(initial.days);
  const [custom, setCustom] = useState(initial.days !== null && !PRESETS.includes(initial.days));
  const [stage, setStage] = useState<StageFilter>(initial.stage);
  const [ready, setReady] = useState<ReadyFilter>(initial.ready);
  const [sort, setSort] = useState<SortKey>(initial.sort);
  // The extra filters (date, readiness, sort) live in a panel that is open only when one of them is in use.
  const extraActive = (days !== null ? 1 : 0) + (ready !== "all" ? 1 : 0) + (sort !== "date" ? 1 : 0);
  const [moreOpen, setMoreOpen] = useState(extraActive > 0);

  const sync = (next: Partial<{ q: string; hospital: string; procedure: string; days: number | null; stage: StageFilter; ready: ReadyFilter; sort: SortKey }>) => {
    const v = { q, hospital, procedure, days, stage, ready, sort, ...next };
    const p = new URLSearchParams();
    if (v.q.trim()) p.set("q", v.q.trim());
    if (v.hospital) p.set("hospital", v.hospital);
    if (v.procedure) p.set("procedure", v.procedure);
    if (v.days) p.set("days", String(v.days));
    if (v.stage !== "active") p.set("stage", v.stage);
    if (v.ready !== "all") p.set("ready", v.ready);
    if (v.sort !== "date") p.set("sort", v.sort);
    const query = p.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };

  const inStage = (s: Stage, f: StageFilter) => (f === "all" ? true : f === "active" ? isActiveStage(s) : s === f);
  const base = useMemo(() => rows
    .filter((r) => (days ? r.daysToSurgery >= 0 && r.daysToSurgery <= days : true))
    .filter((r) => (hospital ? r.hospital === hospital : true))
    .filter((r) => (procedure ? r.procedureLabel === procedure : true))
    .filter((r) => (ready === "all" ? true : r.readinessState === ready))
    .filter((r) => (q.trim() ? r.name.toLowerCase().includes(q.trim().toLowerCase()) : true)), [rows, days, hospital, procedure, ready, q]);
  const filtered = base.filter((r) => inStage(r.stage, stage));
  // "date" keeps the order the page arrived in (by surgery date).
  const shown = sort === "readiness" ? [...filtered].sort((a, b) => a.readiness - b.readiness)
    : sort === "name" ? [...filtered].sort((a, b) => a.name.localeCompare(b.name, lang))
    : filtered;
  const count = (f: StageFilter) => base.filter((r) => inStage(r.stage, f)).length;

  const sel = "field !min-h-11 w-full text-sm sm:!min-h-10 sm:w-auto sm:max-w-[13rem]";
  const stageOptions: [StageFilter, string][] = [["active", t("פעילים")], ...STAGES.map((s) => [s, t(STAGE_LABEL[s])] as [StageFilter, string]), ["all", t("הכול")]];
  const hasFilters = !!q.trim() || !!hospital || !!procedure || stage !== "active" || extraActive > 0;
  const clear = () => {
    setQ(""); setHospital(""); setProcedure(""); setDays(null); setCustom(false); setStage("active"); setReady("all"); setSort("date");
    setSearchOpen(false); setMoreOpen(false);
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

      {/* The four filters: hospital, procedure, status and "more" (date, readiness, sort). Two by two on a phone. */}
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
        <button
          type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen((o) => !o)}
          className={`btn min-h-11 w-full gap-2 text-sm sm:min-h-10 sm:w-auto ${extraActive > 0 ? "border-accent text-accent" : ""}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
            <path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" />
          </svg>
          {t("סינון נוסף")}
          {extraActive > 0 && <span className="num grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs leading-5 text-white">{extraActive}</span>}
        </button>
        {hasFilters && (
          <button type="button" onClick={clear} className="btn btn-quiet col-span-2 min-h-11 text-sm sm:col-span-1 sm:min-h-10">{t("ניקוי סינון")}</button>
        )}
      </div>
      {moreOpen && (
        <div className="card mt-2 grid gap-3 p-3 sm:grid-cols-3 sm:p-4">
          <div>
            <label className="lbl" htmlFor="pl-days">{t("מועד הניתוח")}</label>
            <select
              id="pl-days" className="field !min-h-11 text-sm sm:!min-h-10" value={custom ? "custom" : days ?? ""}
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
                className="field num mt-2 !min-h-11 text-sm sm:!min-h-10"
              />
            )}
          </div>
          <div>
            <label className="lbl" htmlFor="pl-ready">{t("מוכנות")}</label>
            <select id="pl-ready" className="field !min-h-11 text-sm sm:!min-h-10" value={ready} onChange={(e) => { const r = e.target.value as ReadyFilter; setReady(r); sync({ ready: r }); }}>
              <option value="all">{t("כל רמות המוכנות")}</option>
              <option value="ready">{t("מוכנים")}</option>
              <option value="in_progress">{t("בהכנה")}</option>
              <option value="not_ready">{t("לא מוכנים")}</option>
            </select>
          </div>
          <div>
            <label className="lbl" htmlFor="pl-sort">{t("מיון")}</label>
            <select id="pl-sort" className="field !min-h-11 text-sm sm:!min-h-10" value={sort} onChange={(e) => { const k = e.target.value as SortKey; setSort(k); sync({ sort: k }); }}>
              <option value="date">{t("לפי תאריך הניתוח")}</option>
              <option value="readiness">{t("לפי מוכנות (הכי פחות מוכנים קודם)")}</option>
              <option value="name">{t("לפי שם")}</option>
            </select>
          </div>
        </div>
      )}

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
