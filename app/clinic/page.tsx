import Link from "next/link";
import { loadJourneys } from "@/lib/queries";
import { blockerLabel, actionItems, type ActionItem } from "@/lib/journey";
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
import { diffDays, relativeDays, today, LOCALE } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/paginate";
import { ActivityList } from "@/components/activity-list";
import { toItems, type ActivityRow } from "@/lib/activity";
import { requireProfile, getClinicName } from "@/lib/auth";
import { loadQuestions } from "@/lib/doctor-questions";

export const dynamic = "force-dynamic";

const DEFAULT_READY_DAYS = 14;

function Kpi({ href, label, value, tone, alert, className = "" }: { className?: string; href: string; label: string; value: string; tone?: "bad" | "warn" | "ok"; alert?: boolean }) {
  // Calm: only what is late or returned is coloured. Everything else is plain ink.
  const color = tone === "bad" ? "text-bad" : "text-ink";
  return (
    <Link href={href} className={`${className} card relative block min-h-28 min-w-0 p-3 transition hover:border-line-strong sm:p-5 lg:min-h-36`}>
      {alert && <span aria-hidden className="absolute inset-y-6 start-0 hidden w-1 rounded-full bg-bad sm:block" />}
      <p className="text-xs text-muted sm:text-sm">{label}</p>
      <p className={`display num mt-1 text-3xl sm:mt-2 sm:text-5xl ${color}`}>{value}</p>
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
      {href && <Link href={href} className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-accent underline-offset-4 hover:underline">{linkLabel}</Link>}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ hospital?: string; rd?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [t, lang, profile] = await Promise.all([getT(), getLang(), requireProfile(["staff", "doctor"])]);
  const [allJourneysRaw, resetRes, eventsRes, placements, options, templatesRes, clinicName, origin, extras, emailRes, seenRes] = await Promise.all([
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
    // Same "new" marker the full updates page uses, so the preview here agrees with it instead of
    // always showing everything as new (or, with "now", never).
    supabase.from("activity_seen").select("seen_at").eq("user_id", profile.id).maybeSingle(),
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

  const readyDays = parseDays(sp.rd) ?? DEFAULT_READY_DAYS;
  const upcoming = journeys.filter((j) => diffDays(j.surgery_date, t0) >= 0);
  const thisWeek = upcoming.filter((j) => diffDays(j.surgery_date, t0) <= 7);
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
    me: profile.id,
    seenAt: seenRes.data?.seen_at ?? null,
  });

  const hourIL = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Jerusalem" }).format(new Date()));
  const firstName = profile.full_name.split(" ")[0];
  // The doctor keeps the plain "Hello"; the secretary gets a greeting that follows the time of day.
  const greeting = profile.role === "doctor" ? t("שלום {name}", { name: profile.full_name })
    : hourIL < 12 ? t("בוקר טוב, {name}", { name: firstName })
    : hourIL < 18 ? t("צהריים טובים, {name}", { name: firstName })
    : t("ערב טוב, {name}", { name: firstName });
  // The donut of patient readiness (three segments) and the week strip (Sunday to Saturday, with the surgeries on each day).
  const DONUT_R = 46;
  const DONUT_C = 2 * Math.PI * DONUT_R;
  let acc = 0;
  const donut = [{ n: readyN, color: "var(--color-ok)" }, { n: progressN, color: "var(--color-accent)" }, { n: lateN, color: "var(--color-bad)" }]
    .filter((x) => x.n > 0)
    .map((x) => { const len = (x.n / Math.max(upcoming.length, 1)) * DONUT_C; const part = { color: x.color, len: Math.max(len - 2, 1), offset: acc }; acc += len; return part; });
  const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);
  const weekStart = new Date(noon(t0).getTime() - noon(t0).getUTCDay() * 86400000);
  const surgeriesOn = new Map<string, number>();
  for (const j of journeys) surgeriesOn.set(j.surgery_date.slice(0, 10), (surgeriesOn.get(j.surgery_date.slice(0, 10)) ?? 0) + 1);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getTime() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    return {
      iso, day: d.getUTCDate(), today: iso === t0, surgeries: surgeriesOn.get(iso) ?? 0,
      label: d.toLocaleDateString(LOCALE[lang], { weekday: "narrow", timeZone: "UTC" }),
    };
  });

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
        <div className="order-2 flex min-w-0 basis-full flex-wrap items-center gap-3 md:basis-auto">
          <Link href="/clinic/patients?find=1" className="btn btn-sm max-md:hidden md:min-w-56 md:justify-start md:text-muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
            {t("חיפוש מטופל")}
          </Link>
          <HospitalFilter hospitals={hospitals} hospital={sp.hospital} />
          <Link href="/clinic/weekly" className="btn btn-sm btn-primary">{t("סיכום השבוע")}</Link>
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
        <Kpi href={`/clinic/patients?days=7${sp.hospital ? `&hospital=${encodeURIComponent(sp.hospital)}` : ""}`} label={t("ניתוחים השבוע")} value={String(thisWeek.length)} />
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
                      tone={i.kind === "overdue" || i.kind === "rejected" ? "bad" : "warn"}
                      owner={i.task.owner}
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
              <Link href="/clinic/patients" className="card relative mb-3 flex min-h-12 items-center justify-between gap-3 px-5 py-2.5">
                <span aria-hidden className="absolute inset-y-3 start-0 w-1 rounded-full bg-bad" />
                <span className="font-medium text-bad">
                  {t("{n} מתוך {total} הניתוחים השבוע עדיין לא מוכנים", { n: notReadyThisWeek.length, total: thisWeek.length })}
                </span>
                <span className="shrink-0 text-sm text-accent">{t("לצפייה")}</span>
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
          <section aria-labelledby="h-strip">
            <SectionTitle id="h-strip" href="/clinic/calendar" linkLabel={t("ליומן")}>{t("השבוע במרפאה")}</SectionTitle>
            <div className="card p-4" aria-hidden="true">
              <ol className="grid grid-cols-7 gap-1.5 text-center">
                {weekDays.map((d) => (
                  <li key={d.iso} className="min-w-0">
                    <span className="block text-xs text-muted">{d.label}</span>
                    <span className={`num mt-1 grid h-11 place-items-center rounded-2xl text-sm font-medium ${d.today ? "bg-accent text-white" : d.surgeries ? "bg-accent-soft text-accent" : "bg-[var(--hover-tint)]"}`}>
                      {d.day}
                    </span>
                    <span className={`num mt-1 block h-4 text-[11px] ${d.surgeries ? "text-accent" : "text-transparent"}`}>{d.surgeries ? `● ${d.surgeries}` : "·"}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section aria-labelledby="h-ready">
            <SectionTitle id="h-ready" count={upcoming.length} href="/clinic/patients" linkLabel={t("למטופלים")}>{t("מוכנות המטופלים")}</SectionTitle>
            <div className="card p-5">
              {upcoming.length === 0 ? (
                <p className="py-4 text-center text-muted">{t("אין מטופלים עם ניתוח עתידי.")}</p>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="relative size-28 shrink-0">
                    <svg
                      viewBox="0 0 116 116" role="img" className="size-full -rotate-90"
                      aria-label={t("{ready} מוכנים, {progress} בהכנה, {late} באיחור, מתוך {total} מטופלים", { ready: readyN, progress: progressN, late: lateN, total: upcoming.length })}
                    >
                      <circle cx="58" cy="58" r={DONUT_R} fill="none" stroke="var(--color-line)" strokeWidth="14" />
                      {donut.map((p) => (
                        <circle key={p.color} cx="58" cy="58" r={DONUT_R} fill="none" stroke={p.color} strokeWidth="14" strokeDasharray={`${p.len} ${DONUT_C - p.len}`} strokeDashoffset={-p.offset} />
                      ))}
                    </svg>
                    <div className="absolute inset-0 grid place-items-center text-center" aria-hidden="true">
                      <div><div className="display num text-3xl leading-none">{upcoming.length}</div><div className="mt-0.5 text-xs text-muted">{t("מטופלים")}</div></div>
                    </div>
                  </div>
                  <ul className="min-w-0 flex-1 space-y-3 text-sm">
                    <li className="flex items-center gap-2"><span aria-hidden className="size-2.5 rounded-full bg-ok" /> <span className="flex-1">{t("מוכנים")}</span><span className="num font-semibold">{readyN}</span></li>
                    <li className="flex items-center gap-2"><span aria-hidden className="size-2.5 rounded-full bg-accent" /> <span className="flex-1">{t("בהכנה")}</span><span className="num font-semibold">{progressN}</span></li>
                    <li className="flex items-center gap-2"><span aria-hidden className="size-2.5 rounded-full bg-bad" /> <span className="flex-1">{t("יש משימות באיחור")}</span><span className="num font-semibold">{lateN}</span></li>
                  </ul>
                </div>
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
