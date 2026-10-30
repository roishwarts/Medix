import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { blockerLabel, stageOf, isActiveStage, STAGES, STAGE_LABEL, STAGE_PILL, type Stage } from "@/lib/journey";
import { getClinicOptions } from "@/lib/clinic-options";
import { PatientFilters, parseDays } from "@/components/patient-filters";
import { loadJourneys } from "@/lib/queries";
import { formatDate } from "@/lib/dates";
import { ReadinessBar } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Search = { q?: string; notReady?: string; days?: string; hospital?: string; stage?: string };
type StageFilter = Stage | "active" | "all";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const sp = await searchParams;
  const supabase = await createClient();
  const [all, { data: placements }, options] = await Promise.all([
    loadJourneys(),
    // Separate query so the list still works before the hospital/company patch is applied.
    supabase.from("patients").select("id, hospital, company"),
    getClinicOptions(),
  ]);
  const placeOf = new Map((placements ?? []).map((p) => [p.id as string, p as { hospital: string | null; company: string | null }]));
  const hospitals = [...new Set([...options.hospitals, ...(placements ?? []).map((p) => p.hospital as string | null).filter((h): h is string => !!h)])].sort((a, b) => a.localeCompare(b, "he"));
  const days = parseDays(sp.days);
  const stage: StageFilter = sp.stage === "all" || STAGES.includes(sp.stage as Stage) ? (sp.stage as StageFilter) : "active";

  // Everything except the stage tab, so each tab can show how many patients it holds.
  const base = all
    .filter((j) => (sp.notReady ? j.summary.readiness < 100 : true))
    .filter((j) => (days ? j.summary.daysToSurgery >= 0 && j.summary.daysToSurgery <= days : true))
    .filter((j) => (sp.hospital ? placeOf.get(j.patient_id)?.hospital === sp.hospital : true))
    .filter((j) => (sp.q ? j.patient.full_name.includes(sp.q.trim()) : true));
  const stageOfJ = new Map(base.map((j) => [j.id, stageOf(j.summary)]));
  const inTab = (s: Stage, f: StageFilter) => (f === "all" ? true : f === "active" ? isActiveStage(s) : s === f);
  const rows = base.filter((j) => inTab(stageOfJ.get(j.id)!, stage));
  const tabs: [StageFilter, string][] = [["active", t("פעילים")], ...STAGES.map((s) => [s, t(STAGE_LABEL[s])] as [StageFilter, string]), ["all", t("הכול")]];
  const tabHref = (f: StageFilter) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: sp.q, notReady: sp.notReady, days: sp.days, hospital: sp.hospital })) if (v) p.set(k, v);
    if (f !== "active") p.set("stage", f);
    const q = p.toString();
    return q ? `/clinic/patients?${q}` : "/clinic/patients";
  };

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t("{n} מטופלים במערכת", { n: all.length })}</p>
          <h1 className="display mt-1 text-4xl">{t("מטופלים")}</h1>
        </div>
        <div className="flex flex-wrap gap-2 max-sm:w-full max-sm:[&>*]:flex-1">
          <Link href="/clinic/content" className="btn">{t("תוכן למטופלים")}</Link>
          <Link href="/clinic/patients/new" className="btn btn-primary">{t("מטופל חדש")}</Link>
        </div>
      </div>

      <div className="mt-6">
        <PatientFilters action="/clinic/patients" hospitals={hospitals} hospital={sp.hospital} days={days} hidden={{ stage: sp.stage }} t={t}>
          <div className="min-w-44 flex-1">
            <label htmlFor="q" className="lbl">{t("חיפוש שם")}</label>
            <input id="q" name="q" type="search" defaultValue={sp.q} autoComplete="off" enterKeyHint="search" className="field" />
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" name="notReady" value="1" defaultChecked={!!sp.notReady} className="size-4 accent-accent" /> {t("לא מוכנים בלבד")}</label>
        </PatientFilters>
      </div>

      <nav aria-label={t("סטטוס המטופל")} className="chip-row mt-4 flex-wrap">
        {tabs.map(([key, label]) => (
          <Link key={key} href={tabHref(key)} scroll={false} aria-current={key === stage ? "page" : undefined} className="chip min-h-11">
            {label} <span className="num text-xs">{base.filter((j) => inTab(stageOfJ.get(j.id)!, key)).length}</span>
          </Link>
        ))}
      </nav>

      <p className="mt-6 text-sm text-muted" role="status">{rows.length === all.length ? t("מוצגים {n} מטופלים", { n: rows.length }) : t("מוצגים {n} מתוך {total} מטופלים", { n: rows.length, total: all.length })}</p>
      <div className="card mt-2 overflow-x-auto">
        <table className="w-full text-start">
          <caption className="sr-only">{t("רשימת מטופלים")}</caption>
          <thead>
            <tr className="border-b border-line text-start text-sm text-muted">
              <th scope="col" className="px-2 py-3 min-[400px]:px-3 sm:px-4  text-start font-medium">{t("מטופל")}</th>
              <th scope="col" className="px-2 py-3 min-[400px]:px-3 sm:px-4  text-start font-medium">{t("ניתוח")}</th>
              <th scope="col" className="px-2 py-3 min-[400px]:px-3 sm:px-4  text-start font-medium">{t("מוכנות")}</th>
              <th scope="col" className="px-2 py-3 min-[400px]:px-3 sm:px-4 text-start font-medium">{t("סטטוס")}</th>
              <th scope="col" className="hidden px-4 py-3 text-start font-medium lg:table-cell">{t("בית חולים")}</th>
              <th scope="col" className="hidden px-4 py-3 text-start font-medium lg:table-cell">{t("חברה")}</th>
              <th scope="col" className="hidden px-4 py-3 text-start font-medium md:table-cell">{t("שלב נוכחי")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((j) => {
              const href = `/clinic/patients/${j.id}`;
              const place = placeOf.get(j.patient_id);
              // Every cell is a link, so tapping anywhere on the row opens the patient.
              const link = "block px-2 py-3 min-[400px]:px-3 sm:px-4";
              return (
                <tr key={j.id} className="link-row">
                  <td className="min-w-[5.5rem]"><Link href={href} className={`${link} break-words font-medium`}>{j.patient.full_name}</Link></td>
                  <td>
                    <Link href={href} tabIndex={-1} className={`${link} num whitespace-nowrap text-muted`}>
                      {formatDate(j.surgery_date, lang)}
                      <span className="block whitespace-nowrap text-xs min-[400px]:ms-2 min-[400px]:inline">
                        {j.summary.daysToSurgery >= 0 ? t("({n} ימים)", { n: j.summary.daysToSurgery }) : t("(עבר)")}
                      </span>
                    </Link>
                  </td>
                  <td>
                    <Link href={href} tabIndex={-1} className={`${link} flex items-center gap-3`}>
                      <span className="num w-10 shrink-0 font-medium">{j.summary.readiness}%</span>
                      <div className="hidden w-20 sm:block" aria-hidden="true"><ReadinessBar value={j.summary.readiness} state={j.summary.readinessState} /></div>
                    </Link>
                  </td>
                  <td><Link href={href} tabIndex={-1} className={`${link}`}><span className={`pill ${STAGE_PILL[stageOfJ.get(j.id)!]}`}>{t(STAGE_LABEL[stageOfJ.get(j.id)!])}</span></Link></td>
                  <td className="hidden lg:table-cell"><Link href={href} tabIndex={-1} className={`${link} text-sm text-muted`}>{place?.hospital ?? "—"}</Link></td>
                  <td className="hidden lg:table-cell"><Link href={href} tabIndex={-1} className={`${link} text-sm text-muted`}>{place?.company ?? "—"}</Link></td>
                  <td className="hidden md:table-cell"><Link href={href} tabIndex={-1} className={`${link} text-sm text-muted`}>{j.summary.topBlocker ? blockerLabel(j.summary.topBlocker, t) : t("ההכנות הושלמו")}</Link></td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">{t("אין מטופלים שמתאימים לסינון.")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
