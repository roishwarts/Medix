import Link from "next/link";
import { loadJourneys } from "@/lib/queries";
import { ownerLabel, blockerLabel, actionItems, type ActionItem } from "@/lib/journey";
import { getClinicOptions } from "@/lib/clinic-options";
import { HomeTaskRow } from "@/components/home-task-row";
import { getOrigin } from "@/lib/account-links";
import { loadPatientExtras } from "@/lib/patient-extras";
import { taskReminderMessage } from "@/lib/messages";
import { mailtoUrl, whatsAppUrl } from "@/lib/phone";
import { HospitalFilter } from "@/components/hospital-filter";
import { parseDays } from "@/components/patient-filters";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { diffDays, formatDate, relativeDays, today, LOCALE } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/paginate";
import { ActivityList } from "@/components/activity-list";
import { toItems, type ActivityRow } from "@/lib/activity";
import { requireProfile, getClinicName } from "@/lib/auth";
import { Icon } from "@/components/ui";
import { loadQuestions } from "@/lib/doctor-questions";

export const dynamic = "force-dynamic";

const DEFAULT_SURGERY_DAYS = 7;
const DEFAULT_READY_DAYS = 14;

function Kpi({ href, label, value, tone, alert, noIcon, className = "" }: { className?: string; href: string; label: string; value: string; tone?: "bad" | "warn" | "ok"; alert?: boolean; noIcon?: boolean }) {
  const color = tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "text-ink";
  return (
    <Link
      href={href}
      className={`${className} card block min-h-28 min-w-0 p-3 transition hover:border-line-strong sm:p-4 ${alert ? "border-bad/30 bg-bad-soft" : ""}`}
    >
      <p className="flex items-start gap-1.5 text-xs text-muted sm:text-sm">
        {alert && !noIcon && <span className="hidden shrink-0 sm:inline-flex"><Icon name="alert" size={14} /></span>}
        <span>{label}</span>
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
  const [allJourneysRaw, resetRes, eventsRes, placements, options, templatesRes, clinicName, origin, extras, emailRes] = await Promise.all([
    loadJourneys(),
    supabase.from("password_reset_requests").select("id", { count: "exact", head: true }).is("handled_at", null),
    supabase
      .from("activity_events")
      .select("id, kind, actor_id, actor_name, actor_role, subject, detail, created_at, patient_id, journey_id")
      .order("created_at", { ascending: false })
      .limit(5),
    // Paged: Supabase caps a single request at 1000 rows, and a long-running clinic can exceed that.
    fetchAllRows<{ id: string; hospital: string | null }>((from, to) =>
      supabase.from("patients").select("id, hospital").range(from, to),
    ),
    getClinicOptions(),
    supabase.from("templates").select("id", { count: "exact", head: true }),
    getClinicName(),
    getOrigin(),
    loadPatientExtras(),
    // The reminder falls back to email when a patient has no phone.
    supabase.from("patients").select("id, email"),
  ]);
  const templateCount = templatesRes.count ?? 0;
  // A cancelled surgery no longer needs the clinic's attention; it stays on the patient's own card.
  const allJourneys = allJourneysRaw.filter((j) => !j.cancelled_at);
  const t0 = today();
  const hospitalOf = new Map(placements.map((p) => [p.id, p.hospital]));
  const hospitals = [...new Set([...options.hospitals, ...[...hospitalOf.values()].filter((h): h is string => !!h)])].sort((a, b) => a.localeCompare(b, "he"));
  // The hospital and time-frame filter narrow everything on this page.
  const journeys = allJourneys
    .filter((j) => (sp.hospital ? hospitalOf.get(j.patient_id) === sp.hospital : true));
  const resetRequests = resetRes.count ?? 0;
  // Questions the team sent to the doctor, shown on the doctor's own home screen (urgent first, then oldest).
  const openQuestions = profile.role === "doctor"
    ? (await loadQuestions({ limit: 50 })).filter((q) => !q.answeredAt).sort((a, b) => (a.urgent === b.urgent ? (a.askedAt < b.askedAt ? -1 : 1) : a.urgent ? -1 : 1))
    : [];

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
  // Same priority order as the KPI row above (rejected, overdue, review) and the full tasks
  // list: a late task is more urgent than one merely waiting on review, so at real volume the
  // 6-item preview below should never let a pile of "waiting for review" items push actually
  // overdue work out of sight.
  const ATTENTION_RANK: Partial<Record<ActionItem["kind"], number>> = { rejected: 0, overdue: 1, review: 2 };
  const attention = items
    .filter((i) => i.kind === "review" || i.kind === "overdue" || i.kind === "rejected")
    .sort((a, b) => (a.kind === b.kind ? (a.task.dueDate < b.task.dueDate ? -1 : 1) : ATTENTION_RANK[a.kind]! - ATTENTION_RANK[b.kind]!))
    .slice(0, 6);
  const attentionTotal = reviewCount + overdueCount + rejectedCount;
  const phoneOf = new Map(journeys.map((j) => [j.patient_id, j.patient.phone]));
  const emailOf = new Map((emailRes.data ?? []).map((p) => [p.id as string, p.email as string | null]));
  const reminderHref = (i: ActionItem) => {
    if (i.task.owner !== "patient" || i.kind === "review") return null;
    const phone = phoneOf.get(i.patientId);
    const email = emailOf.get(i.patientId);
    if (!phone && !email) return null;
    const msg = taskReminderMessage(i.patientName, clinicName, i.task.title, `${origin}/journey`, extras.get(i.patientId)?.lang ?? "he");
    return phone ? whatsAppUrl(phone, msg) : mailtoUrl(email, t("תזכורת מ{clinic}", { clinic: clinicName }), msg);
  };
  const notReadyThisWeek = thisWeek.filter((j) => j.summary.readiness < 100);

  const updates = toItems(((eventsRes.data ?? []) as ActivityRow[]).slice(0, 5), {
    t,
    patientNames: new Map(journeys.map((j) => [j.patient_id, j.patient.full_name])),
    journeyByPatient,
    me: "",
    seenAt: new Date().toISOString(),
  });

  const hourIL = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Jerusalem" }).format(new Date()));
  const firstName = profile.full_name.split(" ")[0];
  // The doctor keeps the plain "Hello"; the secretary gets a greeting that follows the time of day.
  const greeting = profile.role === "doctor" ? t("שלום {name}", { name: firstName })
    : hourIL < 12 ? t("בוקר טוב, {name}", { name: firstName })
    : hourIL < 18 ? t("צהריים טובים, {name}", { name: firstName })
    : t("ערב טוב, {name}", { name: firstName });
  const seg = (n: number) => (upcoming.length ? (n / upcoming.length) * 100 : 0);

  return (
    <main className="space-y-8">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* The logo and a settings entry point already sit in the persistent mobile top bar
            (app/clinic/layout.tsx) on every page, this one included - no need to repeat them here. */}
        <div className="order-1 min-w-0 flex-1">
          <p className="text-sm font-medium text-muted sm:text-base">
            {new Date().toLocaleDateString(LOCALE[lang], { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jerusalem" })}
          </p>
          <h1 className="display mt-0.5 text-2xl sm:text-4xl">{greeting}</h1>
        </div>
        <div className="order-2 flex min-w-0 basis-full items-center gap-3 md:basis-auto">
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

      {/* The numbers: three on a phone, five on a desktop (returned-for-fix and ready join there). */}
      <section aria-label={t("דורש טיפול עכשיו")} className="grid grid-cols-3 gap-3 lg:grid-cols-5">
        <Kpi href="/clinic/tasks?status=overdue" label={t("משימות באיחור")} value={String(overdueCount)} tone={overdueCount > 0 ? "bad" : "ok"} alert={overdueCount > 0} />
        <Kpi href="/clinic/tasks?status=review" label={t("ממתין לבדיקה")} value={String(reviewCount)} tone={reviewCount > 0 ? "warn" : "ok"} />
        <Kpi className="max-lg:hidden" href="/clinic/tasks?status=rejected" label={t("הוחזר לתיקון")} value={String(rejectedCount)} tone={rejectedCount > 0 ? "bad" : "ok"} alert={rejectedCount > 0} />
        <Kpi href={`/clinic/patients?days=7${sp.hospital ? `&hospital=${encodeURIComponent(sp.hospital)}` : ""}`} label={t("ניתוחים בשבוע הקרוב")} value={String(thisWeek.length)} />
        <Kpi className="max-lg:hidden" href={`/clinic/patients?stage=ready&days=${readyDays}${sp.hospital ? `&hospital=${encodeURIComponent(sp.hospital)}` : ""}`} label={t("מוכנים לניתוח")} value={String(soonReady)} tone={soon.length === 0 ? undefined : soonReady === soon.length ? "ok" : "warn"} />
      </section>

      {openQuestions.length > 0 && (
        <section aria-label={t("שאלות לרופא")} className="card overflow-hidden border-accent-line">
          <div className="flex items-center justify-between gap-3 bg-accent-soft px-4 py-3">
            <h2 className="font-medium">
              {openQuestions.length === 1 ? t("שאלה אחת ממתינה לתשובתך") : t("{n} שאלות ממתינות לתשובתך", { n: openQuestions.length })}
            </h2>
            <Link href="/clinic/questions" className="shrink-0 text-sm text-accent underline-offset-4 hover:underline">{t("לכל השאלות")}</Link>
          </div>
          <ul className="divide-y divide-line">
            {openQuestions.slice(0, 3).map((q) => (
              <li key={q.id}>
                <Link href="/clinic/questions" className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 hover:bg-paper">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{q.patientName}</span>
                    <span className="block truncate text-sm text-muted">{q.question}</span>
                  </span>
                  {q.urgent && <span className="pill pill-bad shrink-0">{t("דחוף")}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resetRequests > 0 && (
        <Link href="/clinic/tasks" className="card flex min-h-14 items-center justify-between gap-3 border-warn/30 bg-warn-soft px-4 py-3">
          <span className="font-medium">
            <span className="num">{resetRequests}</span> {resetRequests === 1 ? t("בקשה לאיפוס סיסמה ממתינה") : t("בקשות לאיפוס סיסמה ממתינות")}
          </span>
          <span className="shrink-0 text-sm text-accent">{t("לטיפול")}</span>
        </Link>
      )}

      <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
        <div className="min-w-0 space-y-8 lg:col-span-3">
          <section aria-labelledby="h-attention">
            <SectionTitle id="h-attention" count={attentionTotal} href="/clinic/tasks" linkLabel={t("לכל המשימות")}>{t("דורש טיפול")}</SectionTitle>
            {attention.length === 0 ? (
              <p className="card px-4 py-8 text-center text-muted">{t("אין משימות שממתינות לטיפול. הכול מעודכן.")}</p>
            ) : (
              <>
                <div className="card divide-y divide-line">
                  {attention.map((i, idx) => (
                    <HomeTaskRow
                      key={i.task.id}
                      taskId={i.task.id}
                      href={`/clinic/patients/${journeyByPatient.get(i.patientId)}`}
                      kind={i.kind}
                      patientName={i.patientName}
                      title={i.task.title}
                      urgent={i.kind === "overdue" || i.kind === "rejected"}
                      status={i.kind === "rejected" ? t("הוחזר לתיקון") : i.kind === "review" ? t("ממתין לבדיקה") : t("באיחור · {when}", { when: relativeDays(i.task.dueDate, t0, lang) })}
                      phone={phoneOf.get(i.patientId) ?? null}
                      reminderHref={reminderHref(i)}
                      hidden={idx >= 3}
                    />
                  ))}
                </div>
                {attentionTotal > 3 && (
                  <p className="mt-2 flex items-center justify-between px-1 text-sm text-muted sm:hidden">
                    <span>{t("עוד {n} משימות", { n: attentionTotal - 3 })}</span>
                    <Link href="/clinic/tasks" className="inline-flex min-h-11 items-center text-accent">{t("לכל המשימות")}</Link>
                  </p>
                )}
              </>
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
                {thisWeek.map((j) => {
                  const day = j.surgery_date.slice(8, 10).replace(/^0/, "");
                  const month = new Date(`${j.surgery_date}T12:00:00`).toLocaleDateString(LOCALE[lang], { month: "short" });
                  const ready = j.summary.readiness === 100;
                  return (
                    <Link key={j.id} href={`/clinic/patients/${j.id}`} className="flex items-center gap-3 px-4 py-3 link-row">
                      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent text-center leading-tight text-white">
                        <span><span className="num block text-base font-semibold">{day}</span><span className="block text-[11px]">{month}</span></span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words font-medium">{j.patient.full_name}</span>
                        <span className="block break-words text-sm text-muted">
                          {j.summary.topBlocker ? blockerLabel(j.summary.topBlocker, t) : j.procedure || t("ההכנות הושלמו")}
                          <span className="sr-only"> · {relativeDays(j.surgery_date, t0, lang)}</span>
                        </span>
                      </span>
                      <span className={`pill shrink-0 ${ready ? "pill-ok" : "pill-bad"}`}>{ready ? t("מוכן") : t("לא מוכן")}</span>
                    </Link>
                  );
                })}
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
