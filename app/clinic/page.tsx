import Link from "next/link";
import { loadJourneys } from "@/lib/queries";
import { ownerLabel, blockerLabel, actionItems, type ActionItem } from "@/lib/journey";
import { getClinicOptions } from "@/lib/clinic-options";
import { KpiWindow } from "@/components/kpi-window";
import { HospitalFilter } from "@/components/hospital-filter";
import { parseDays } from "@/components/patient-filters";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { diffDays, formatDate, relativeDays, today } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { ActivityList } from "@/components/activity-list";
import { toItems, type ActivityRow } from "@/lib/activity";
import { requireProfile } from "@/lib/auth";
import { Icon } from "@/components/ui";

export const dynamic = "force-dynamic";

const DEFAULT_SURGERY_DAYS = 7;
const DEFAULT_READY_DAYS = 14;

function Kpi({ href, label, value, tone, alert }: { href: string; label: string; value: string; tone?: "bad" | "warn" | "ok"; alert?: boolean }) {
  const color = tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "text-ink";
  return (
    <Link
      href={href}
      className={`card block min-h-28 p-4 transition hover:border-line-strong ${alert ? "border-bad/30 bg-bad-soft" : ""}`}
    >
      <p className="flex items-center gap-1.5 text-sm text-muted">
        {alert && <Icon name="alert" size={14} />}
        {label}
      </p>
      <p className={`display num mt-1 text-3xl sm:text-4xl ${color}`}>{value}</p>
    </Link>
  );
}

function SectionTitle({ id, children, count, href, linkLabel }: { id: string; children: React.ReactNode; count?: number; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 id={id} className="flex items-baseline gap-2 text-lg font-medium">
        {children}
        {count !== undefined && <span className="num text-sm text-muted">{count}</span>}
      </h2>
      {href && <Link href={href} className="inline-flex min-h-11 items-center text-sm text-accent underline-offset-4 hover:underline">{linkLabel}</Link>}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ hospital?: string; kd?: string; rd?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [t, lang, profile] = await Promise.all([getT(), getLang(), requireProfile(["staff", "doctor"])]);
  const [allJourneys, resetRes, eventsRes, { data: placements }, options, templatesRes] = await Promise.all([
    loadJourneys(),
    supabase.from("password_reset_requests").select("id", { count: "exact", head: true }).is("handled_at", null),
    supabase
      .from("activity_events")
      .select("id, kind, actor_id, actor_name, actor_role, subject, detail, created_at, patient_id, journey_id")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("patients").select("id, hospital"),
    getClinicOptions(),
    supabase.from("templates").select("id", { count: "exact", head: true }),
  ]);
  const templateCount = templatesRes.count ?? 0;
  const t0 = today();
  const hospitalOf = new Map((placements ?? []).map((p) => [p.id as string, p.hospital as string | null]));
  const hospitals = [...new Set([...options.hospitals, ...[...hospitalOf.values()].filter((h): h is string => !!h)])].sort((a, b) => a.localeCompare(b, "he"));
  // The hospital and time-frame filter narrow everything on this page.
  const journeys = allJourneys
    .filter((j) => (sp.hospital ? hospitalOf.get(j.patient_id) === sp.hospital : true));
  const resetRequests = resetRes.count ?? 0;

  const items: ActionItem[] = journeys.flatMap((j) => actionItems(j.patient_id, j.patient.full_name, j.surgery_date, j.summary.tasks, t0));
  const reviewCount = items.filter((i) => i.kind === "review").length;
  const overdueCount = items.filter((i) => i.kind === "overdue").length;
  const rejectedCount = items.filter((i) => i.kind === "rejected").length;

  const surgeryDays = parseDays(sp.kd) ?? DEFAULT_SURGERY_DAYS;
  const readyDays = parseDays(sp.rd) ?? DEFAULT_READY_DAYS;
  const upcoming = journeys.filter((j) => diffDays(j.surgery_date, t0) >= 0);
  const thisWeek = upcoming.filter((j) => diffDays(j.surgery_date, t0) <= 7);
  const kpiSurgeries = upcoming.filter((j) => diffDays(j.surgery_date, t0) <= surgeryDays);
  const soon = upcoming.filter((j) => diffDays(j.surgery_date, t0) <= readyDays);
  const soonReady = soon.filter((j) => j.summary.readiness === 100).length;

  const readyN = upcoming.filter((j) => j.summary.readinessState === "ready").length;
  const lateN = upcoming.filter((j) => j.summary.readinessState === "not_ready").length;
  const progressN = upcoming.length - readyN - lateN;

  const journeyByPatient = new Map(journeys.map((j) => [j.patient_id, j.id]));
  const ATTENTION_RANK: Partial<Record<ActionItem["kind"], number>> = { rejected: 0, review: 1, overdue: 2 };
  const attention = items
    .filter((i) => i.kind === "review" || i.kind === "overdue" || i.kind === "rejected")
    .sort((a, b) => (a.kind === b.kind ? (a.task.dueDate < b.task.dueDate ? -1 : 1) : ATTENTION_RANK[a.kind]! - ATTENTION_RANK[b.kind]!))
    .slice(0, 6);
  const notReadyThisWeek = thisWeek.filter((j) => j.summary.readiness < 100);

  const updates = toItems(((eventsRes.data ?? []) as ActivityRow[]).slice(0, 5), {
    t,
    patientNames: new Map(journeys.map((j) => [j.patient_id, j.patient.full_name])),
    journeyByPatient,
    me: "",
    seenAt: new Date().toISOString(),
  });

  const seg = (n: number) => (upcoming.length ? (n / upcoming.length) * 100 : 0);

  return (
    <main className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h1 className="display text-3xl sm:text-4xl">{t("לוח בקרה")}</h1>
        <div className="flex items-center gap-3">
          <Link href="/clinic/weekly" className="btn btn-sm">{t("סיכום השבוע")}</Link>
          <HospitalFilter hospitals={hospitals} hospital={sp.hospital} />
        </div>
      </header>

      {templateCount === 0 ? (
        <div className="card space-y-3 border-accent-line bg-accent-soft p-5">
          <p className="font-medium">{t("בואו נתחיל: עוד אין תבנית פרוטוקול במרפאה")}</p>
          <p className="text-sm text-muted">
            {profile.role === "doctor"
              ? t("תבנית מגדירה את שלבי ההכנה לניתוח — איזה מסמכים צריך, מתי, וממי. אחרי שתיצרו אחת, אפשר להוסיף מטופלים.")
              : t("בקשו מהרופא להגדיר תבנית פרוטוקול ראשונה. ברגע שתהיה תבנית, אפשר יהיה להוסיף מטופלים.")}
          </p>
          {profile.role === "doctor" && (
            <Link href="/clinic/templates/new" className="btn btn-primary btn-sm">{t("יצירת תבנית ראשונה")}</Link>
          )}
        </div>
      ) : allJourneys.length === 0 && (
        <div className="card space-y-3 border-accent-line bg-accent-soft p-5">
          <p className="font-medium">{t("צעד הבא: הוספת המטופל הראשון")}</p>
          <p className="text-sm text-muted">{t("יש לכם תבנית מוכנה — עכשיו אפשר להתחיל מסלול למטופל הראשון שלכם.")}</p>
          <Link href="/clinic/patients/new" className="btn btn-primary btn-sm">{t("הוספת מטופל")}</Link>
        </div>
      )}

      {resetRequests > 0 && (
        <Link href="/clinic/tasks" className="card flex min-h-14 items-center justify-between gap-3 border-warn/30 bg-warn-soft px-4 py-3">
          <span className="font-medium">
            <span className="num">{resetRequests}</span> {resetRequests === 1 ? t("בקשה לאיפוס סיסמה ממתינה") : t("בקשות לאיפוס סיסמה ממתינות")}
          </span>
          <span className="shrink-0 text-sm text-accent">{t("לטיפול")}</span>
        </Link>
      )}

      <section aria-label={t("דורש טיפול עכשיו")} className="grid grid-cols-3 gap-3">
        <Kpi href="/clinic/tasks?status=rejected" label={t("הוחזר לתיקון")} value={String(rejectedCount)} tone={rejectedCount > 0 ? "bad" : "ok"} alert={rejectedCount > 0} />
        <Kpi href="/clinic/tasks?status=overdue" label={t("משימות באיחור")} value={String(overdueCount)} tone={overdueCount > 0 ? "bad" : "ok"} alert={overdueCount > 0} />
        <Kpi href="/clinic/tasks?status=review" label={t("ממתין לבדיקה")} value={String(reviewCount)} tone={reviewCount > 0 ? "warn" : undefined} />
      </section>

      <section aria-label={t("תמונת מצב כללית")} className="grid grid-cols-2 gap-3">
        <KpiWindow label={t("ניתוחים")} value={String(kpiSurgeries.length)} href={`/clinic/patients?days=${surgeryDays}`} param="kd" days={surgeryDays} />
        <KpiWindow
          label={t("מוכנים לניתוח")} value={String(soonReady)} href={`/clinic/patients?stage=ready&days=${readyDays}`} param="rd" days={readyDays}
          tone={soon.length === 0 ? "none" : soonReady === soon.length ? "ok" : "warn"}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
        <div className="min-w-0 space-y-8 lg:col-span-3">
          <section aria-labelledby="h-attention">
            <SectionTitle id="h-attention" count={reviewCount + overdueCount + rejectedCount} href="/clinic/tasks" linkLabel={t("לכל המשימות")}>{t("דורש טיפול")}</SectionTitle>
            {attention.length === 0 ? (
              <p className="card px-4 py-8 text-center text-muted">{t("אין משימות שממתינות לטיפול. הכול מעודכן.")}</p>
            ) : (
              <div className="card divide-y divide-line">
                {attention.map((i) => (
                  <Link key={i.task.id} href={`/clinic/patients/${journeyByPatient.get(i.patientId)}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3 link-row">
                    <span className="min-w-0 break-words font-medium">{i.patientName}</span>
                    <span className={`text-sm sm:whitespace-nowrap ${i.kind === "overdue" || i.kind === "rejected" ? "font-medium text-bad" : "text-warn"}`}>
                      {i.kind === "rejected" ? t("הוחזר לתיקון") : i.kind === "review" ? t("ממתין לבדיקה") : t("באיחור · {when}", { when: relativeDays(i.task.dueDate, t0, lang) })}
                    </span>
                    <span className="col-span-2 min-w-0 break-words text-sm text-muted">
                      {i.task.title}
                      {(i.kind === "overdue" || i.kind === "rejected") && <span className="pill pill-neutral ms-2 align-middle">{t("אצל {owner}", { owner: ownerLabel(i.task.owner, t) })}</span>}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="h-week">
            <SectionTitle id="h-week" count={thisWeek.length} href="/clinic/calendar" linkLabel={t("ליומן")}>{t("ניתוחים השבוע")}</SectionTitle>
            {notReadyThisWeek.length > 0 && (
              <Link href="/clinic/patients" className="card mb-3 flex min-h-12 items-center justify-between gap-3 border-bad/30 bg-bad-soft px-4 py-2.5">
                <span className="font-medium text-bad">
                  {t("{n} מתוך {total} הניתוחים השבוע עדיין לא מוכנים", { n: notReadyThisWeek.length, total: thisWeek.length })}
                </span>
                <span className="shrink-0 text-sm text-bad">{t("לצפייה")}</span>
              </Link>
            )}
            {thisWeek.length === 0 ? (
              <p className="card px-4 py-8 text-center text-muted">{t("אין ניתוחים ב־7 הימים הקרובים.")}</p>
            ) : (
              <div className="card divide-y divide-line">
                {thisWeek.map((j) => (
                  <Link key={j.id} href={`/clinic/patients/${j.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3 link-row">
                    <span className="min-w-0 break-words font-medium">{j.patient.full_name}</span>
                    <span className={`num text-sm font-medium ${j.summary.readiness === 100 ? "text-ok" : "text-bad"}`}>
                      <span className="sr-only">{t("מוכנות")} </span>{j.summary.readiness}%
                    </span>
                    <span className="min-w-0 break-words text-sm text-muted">{j.summary.topBlocker ? blockerLabel(j.summary.topBlocker, t) : t("ההכנות הושלמו")}</span>
                    <span className="text-sm text-muted sm:whitespace-nowrap">{formatDate(j.surgery_date, lang)} · {relativeDays(j.surgery_date, t0, lang)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-8 lg:col-span-2">
          <section aria-labelledby="h-ready">
            <SectionTitle id="h-ready" count={upcoming.length} href="/clinic/patients" linkLabel={t("למטופלים")}>{t("מוכנות המטופלים")}</SectionTitle>
            <div className="card p-4">
              {upcoming.length === 0 ? (
                <p className="py-4 text-center text-muted">{t("אין מטופלים עם ניתוח עתידי.")}</p>
              ) : (
                <>
                  <div
                    role="img"
                    aria-label={t("{ready} מוכנים, {progress} בהכנה, {late} באיחור, מתוך {total} מטופלים", { ready: readyN, progress: progressN, late: lateN, total: upcoming.length })}
                    className="flex h-3 overflow-hidden rounded-full bg-line"
                  >
                    <div className="bg-ok" style={{ width: `${seg(readyN)}%` }} />
                    <div className="bg-accent" style={{ width: `${seg(progressN)}%` }} />
                    <div className="bg-bad" style={{ width: `${seg(lateN)}%` }} />
                  </div>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center gap-2"><span aria-hidden className="size-2.5 rounded-full bg-ok" /> <span className="flex-1">{t("מוכנים")}</span><span className="num font-medium">{readyN}</span></li>
                    <li className="flex items-center gap-2"><span aria-hidden className="size-2.5 rounded-full bg-accent" /> <span className="flex-1">{t("בהכנה")}</span><span className="num font-medium">{progressN}</span></li>
                    <li className="flex items-center gap-2"><span aria-hidden className="size-2.5 rounded-full bg-bad" /> <span className="flex-1">{t("יש משימות באיחור")}</span><span className="num font-medium">{lateN}</span></li>
                  </ul>
                </>
              )}
            </div>
          </section>

          <section aria-labelledby="h-updates">
            <SectionTitle id="h-updates" href="/clinic/activity" linkLabel={t("לכל העדכונים")}>{t("עדכונים אחרונים")}</SectionTitle>
            <ActivityList items={updates} />
          </section>
        </div>
      </div>
    </main>
  );
}
