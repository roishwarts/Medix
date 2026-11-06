import Link from "next/link";
import { Fragment } from "react";
import { notFound, redirect } from "next/navigation";
import { requireProfile, getClinicName } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadJourney } from "@/lib/queries";
import { getOrigin } from "@/lib/account-links";
import { taskReminderMessage } from "@/lib/messages";
import { ReminderButton } from "@/components/reminder-button";
import { ownerLabel, blockerLabel, nowTask } from "@/lib/journey";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { formatDate, formatDateLong, israelParts, relativeDays } from "@/lib/dates";
import { Icon, ReadinessBar } from "@/components/ui";
import { LiveTaskPill } from "@/components/task-optimistic";
import { TaskReview } from "./task-review";
import { ScheduleControl } from "./schedule-control";
import { CaregiverList } from "@/components/caregiver-list";
import { PatientDetails } from "./patient-details";
import { patientExtras } from "@/lib/patient-extras";
import { stageOf } from "@/lib/journey";
import { InvitationPanel } from "./invitation-panel";
import { AddCaregiver } from "./add-caregiver";
import { PendingInvites } from "./pending-invites";
import { ActivityList } from "@/components/activity-list";
import { toItems, type ActivityRow } from "@/lib/activity";
import { getClinicOptions } from "@/lib/clinic-options";
import { MeetingSummaries, type SummaryItem, type ApptOption } from "./meeting-summaries";
import { ReferralsCard } from "./referrals-card";
import { CancelledBanner, CancelTrigger } from "./cancel-journey";
import { PromsCard } from "./proms-card";
import { AllDocuments, type DocItem } from "./all-documents";
import { StartJourney } from "./start-journey";
import { ClinicalSummary, type ClinicalData } from "./clinical-summary";
import { DoctorQuestions } from "./doctor-questions";
import { DoctorQuickBar } from "./doctor-quick-bar";
import { loadQuestions } from "@/lib/doctor-questions";
import type { CancelReason } from "@/lib/cancel-reasons";

export const dynamic = "force-dynamic";

const FILTERS = [
  ["all", "הכול"],
  ["todo", "פתוח"],
  ["review", "ממתין לבדיקה"],
  ["rejected", "הוחזר לתיקון"],
  ["overdue", "באיחור"],
  ["locked", "נעול"],
  ["done", "הושלם"],
] as const;
type FilterKey = (typeof FILTERS)[number][0];

export default async function PatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const [tr, lang] = await Promise.all([getT(), getLang()]);
  const { status } = await searchParams;
  const active: FilterKey = FILTERS.some(([k]) => k === status) ? (status as FilterKey) : "all";
  const supabase = await createClient();
  // Everything that does not depend on the journey is fetched together with it.
  const [profile, journey, options, { data: templates }, clinicName, origin] = await Promise.all([
    requireProfile(["staff", "doctor"]),
    loadJourney(id),
    getClinicOptions(),
    supabase.from("templates").select("id, name").order("name"),
    getClinicName(),
    getOrigin(),
  ]);
  if (!journey) {
    // Some links (the referral pages) carry the patient's id instead of the journey's: send them to the right card.
    const { data: byPatient } = await supabase.from("journeys").select("id").eq("patient_id", id).maybeSingle();
    if (byPatient?.id) redirect(`/clinic/patients/${byPatient.id}`);
    notFound();
  }
  const isDoctor = profile.role === "doctor";
  const { summary } = journey;
  const matches = (t: (typeof summary.tasks)[number], key: FilterKey) =>
    key === "all" || (key === "overdue" ? t.overdue : t.state === key);
  // In the unfiltered view, tasks that need the clinic's attention now surface above the rest
  // (which stay in surgery-date order); within a single-status filter the order is unchanged.
  const actionRank = (t: (typeof summary.tasks)[number]) => (t.overdue ? 0 : t.state === "rejected" ? 0 : t.state === "review" ? 1 : 2);
  const needsAttention = summary.tasks.filter((t) => t.overdue || t.state === "rejected" || t.state === "review").length;
  const visibleTasks =
    active === "all"
      ? [...summary.tasks].sort((a, b) => actionRank(a) - actionRank(b))
      : summary.tasks.filter((t) => matches(t, active));

  const [{ data: caregivers }, { data: patientRow }, { data: placement }, { data: medicalInfo }, { data: openInvites }, { data: historyRows }, urlEntries, { data: summaryRows }, { data: referralRows }, { data: teamRows }, { data: cancelRow }, extras] = await Promise.all([
    supabase
      .from("patient_caregivers")
      .select("id, user_id, full_name, relation, can_act, created_at")
      .eq("patient_id", journey.patient_id)
      .order("created_at"),
    supabase.from("patients").select("user_id, email").eq("id", journey.patient_id).maybeSingle(),
    // Separate query so the page still works before the hospital/company patch is applied.
    supabase.from("patients").select("hospital, company").eq("id", journey.patient_id).maybeSingle(),
    // Separate query so the page still works before patch-medical-info.sql is applied.
    supabase.from("patients").select("national_id, hmo, insurance_company, insurance_policy_number, insurance_phone").eq("id", journey.patient_id).maybeSingle(),
    // Not filtered to still-valid invites: an expired, never-used one is shown too (marked as
    // such) so staff notice and can re-invite, instead of it just silently vanishing from view.
    supabase
      .from("caregiver_invites")
      .select("id, invitee_name, relation, can_act, expires_at")
      .eq("patient_id", journey.patient_id)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("activity_events")
      .select("id, kind, actor_id, actor_name, actor_role, subject, detail, created_at, patient_id, journey_id")
      .eq("patient_id", journey.patient_id)
      .order("created_at", { ascending: false })
      .limit(20),
    Promise.all(
      summary.tasks
        .filter((t) => t.evidence_path)
        .map(async (t) => {
          const { data } = await supabase.storage.from("evidence").createSignedUrl(t.evidence_path!, 600);
          return [t.id, data?.signedUrl] as const;
        }),
    ),
    // Meeting summaries: now visible to all staff, not just doctors.
    supabase
      .from("visit_notes")
      .select("id, journey_task_id, occurred_at, note, follow_up, author_id")
      .eq("patient_id", journey.patient_id)
      .order("occurred_at", { ascending: false }),
    // Tried with the result-tracking columns first (patch-referral-results.sql); falls back to the
    // base columns so existing referrals still show before that patch has been applied.
    supabase
      .from("referrals")
      .select("id, recipient, reason, created_at, result_status, result_path, result_name, result_received_at")
      .eq("patient_id", journey.patient_id)
      .order("created_at", { ascending: false })
      .then((res) =>
        res.error
          ? supabase.from("referrals").select("id, recipient, reason, created_at").eq("patient_id", journey.patient_id).order("created_at", { ascending: false })
          : res,
      ),
    supabase.from("profiles").select("id, full_name").eq("clinic_id", profile.clinic_id),
    // Separate query so the page still works before patch-outcomes.sql is applied.
    supabase.from("journeys").select("cancelled_at, cancelled_reason").eq("id", journey.id).maybeSingle(),
    patientExtras(journey.patient_id),
  ]);
  // Same for the clinical summary and the questions for the doctor (patch-doctor-queue.sql).
  const [clinicalRes, questions, questionsAvailabilityRes] = await Promise.all([
    supabase.from("clinical_summaries").select("diagnosis, side, allergies, medications, medical_history, notes").eq("journey_id", journey.id).maybeSingle(),
    loadQuestions({ patientId: journey.patient_id, limit: 50 }),
    supabase.from("doctor_questions").select("id", { head: true, count: "exact" }).limit(1),
  ]);
  const clinicalAvailable = !clinicalRes.error;
  const clinical: ClinicalData | null = clinicalRes.data
    ? {
        diagnosis: clinicalRes.data.diagnosis, side: clinicalRes.data.side as ClinicalData["side"], allergies: clinicalRes.data.allergies,
        medications: clinicalRes.data.medications, medicalHistory: clinicalRes.data.medical_history, notes: clinicalRes.data.notes,
      }
    : null;
  const questionsAvailable = !questionsAvailabilityRes.error;
  const referrals = (referralRows ?? []) as {
    id: string; recipient: string; reason: string; created_at: string;
    result_status?: "pending" | "received"; result_path?: string | null; result_name?: string | null; result_received_at?: string | null;
  }[];
  const resultUrls = new Map<string, string>();
  await Promise.all(
    referrals.filter((r) => r.result_path).map(async (r) => {
      const { data } = await supabase.storage.from("referral-results").createSignedUrl(r.result_path!, 600);
      if (data?.signedUrl) resultUrls.set(r.id, data.signedUrl);
    }),
  );
  const authorName = new Map((teamRows ?? []).map((p) => [p.id as string, p.full_name as string]));
  const taskTitleById = new Map(summary.tasks.map((tk) => [tk.id, tk.title]));
  const summaries: SummaryItem[] = (summaryRows ?? []).map((s) => ({
    id: s.id, occurredAt: s.occurred_at, note: s.note, followUp: s.follow_up,
    authorName: authorName.get(s.author_id) ?? tr("איש צוות"),
    journeyTaskId: s.journey_task_id, linkedTitle: s.journey_task_id ? (taskTitleById.get(s.journey_task_id) ?? null) : null,
  }));
  const appointmentOptions: ApptOption[] = summary.tasks
    .filter((tk) => tk.kind === "appointment")
    .map((tk) => ({ id: tk.id, title: tk.title, eventDate: tk.eventDate }));

  const history = toItems((historyRows ?? []) as ActivityRow[], {
    t: tr,
    patientNames: new Map(),
    journeyByPatient: new Map([[journey.patient_id, id]]),
    me: "",
    seenAt: new Date().toISOString(),
  });
  const cgByUser = new Map((caregivers ?? []).map((c) => [c.user_id as string, c]));
  const urls = new Map<string, string>();
  for (const [taskId, url] of urlEntries) if (url) urls.set(taskId, url);

  const allDocs: DocItem[] = [
    ...summary.tasks
      .filter((tk) => tk.evidence_name)
      .map((tk): DocItem => ({ id: tk.id, title: tk.title, fileName: tk.evidence_name!, url: urls.get(tk.id), date: tk.submitted_at })),
    ...referrals
      .filter((r) => r.result_name)
      .map((r): DocItem => ({
        id: r.id, title: tr("תוצאה: {recipient}", { recipient: r.recipient }), fileName: r.result_name!,
        url: resultUrls.get(r.id), date: r.result_received_at ?? null,
      })),
  ];

  const autoStage = stageOf(summary, !!cancelRow?.cancelled_at);

  return (
    <main>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-x-6">
        <div className="min-w-0">
          <h1 className="display text-3xl sm:text-4xl">{journey.patient.full_name}</h1>
          {/* The procedure, the surgery date and the readiness on one line. */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
            <span>{journey.procedure || journey.template_name}</span>
            <span aria-hidden="true">·</span>
            <span>
              <span className="font-medium text-ink">{formatDateLong(journey.surgery_date, lang)}</span>{" "}
              <span className="text-sm">({relativeDays(journey.surgery_date, undefined, lang)})</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-2">
              <span className="text-sm">{tr("מוכנות לניתוח")}</span>
              <span className="num font-medium text-ink">{summary.readiness}%</span>
              <span className="inline-block w-20" aria-hidden="true"><ReadinessBar value={summary.readiness} state={summary.readinessState} /></span>
            </span>
          </div>
          {summary.topBlocker && (
            <p className="mt-1 text-sm text-muted">
              {tr("שלב נוכחי")}: {blockerLabel(summary.topBlocker, tr)} · {tr("יעד {date}", { date: formatDate(summary.topBlocker.task.dueDate, lang) })}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href={`/clinic/patients/${id}/summary/print`} target="_blank" className="text-muted hover:text-ink hover:underline">{tr("דף סיכום להדפסה")}</Link>
          {isDoctor && <Link href={`/clinic/patients/${id}/export`} className="text-muted hover:text-ink hover:underline">{tr("ייצוא כל הנתונים")}</Link>}
        </div>
      </div>

      {cancelRow?.cancelled_at && (
        <div className="mt-6">
          <CancelledBanner journeyId={journey.id} lang={lang} cancelledAt={cancelRow.cancelled_at} cancelledReason={(cancelRow.cancelled_reason ?? null) as CancelReason | null} />
        </div>
      )}
      <div className="mt-6 grid gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start">
      <div className="min-w-0 space-y-10">
      <section>
        <h2 className="mb-1 flex flex-wrap items-center gap-2 text-lg font-medium">
          {tr("כל המשימות")}
          {needsAttention > 0 && <span className="pill pill-bad">{tr("{n} דורשות תשומת לב", { n: needsAttention })}</span>}
        </h2>
        <nav aria-label={tr("סינון משימות לפי סטטוס")} className="chip-row">
          {FILTERS.map(([key, label]) => {
            const count = summary.tasks.filter((t) => matches(t, key)).length;
            const on = key === active;
            const isAttentionFilter = (key === "review" || key === "rejected" || key === "overdue") && count > 0;
            return (
              <Link
                key={key}
                href={key === "all" ? `/clinic/patients/${id}` : `/clinic/patients/${id}?status=${key}`}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className="chip min-h-11"
              >
                {tr(label)}{" "}
                <span className={`num text-xs ${isAttentionFilter ? (key === "review" ? "text-warn font-semibold" : "text-bad font-semibold") : ""}`}>{count}</span>
              </Link>
            );
          })}
        </nav>
        {visibleTasks.length === 0 && <p className="mt-3 px-1 py-10 text-center text-muted">{tr("אין משימות בסטטוס הזה.")}</p>}
        {/* The journey as the patient sees it (a timeline, no boxes), with the clinic's small actions under each step. */}
        <ol className="mt-4">
          {visibleTasks.map((t, idx) => {
            const nowId = nowTask(summary.tasks)?.id;
            const isNow = t.id === nowId;
            const showSurgeryDay = active === "all" && !t.preop && (idx === 0 || visibleTasks[idx - 1].preop);
            const bad = t.overdue || t.state === "rejected";
            let node: React.ReactNode;
            if (t.state === "done") node = <span className="grid size-7 place-items-center rounded-full bg-ok text-white"><Icon name="check" size={14} /></span>;
            else if (isNow) node = <span className={`grid size-7 place-items-center rounded-full border-2 ${bad ? "border-bad" : "border-accent"} bg-surface`}><span className={`size-2.5 rounded-full ${bad ? "bg-bad" : "bg-accent"}`} /></span>;
            else if (t.state === "review") node = <span className="grid size-7 place-items-center rounded-full border-2 border-warn bg-warn-soft text-warn"><Icon name="clock" size={14} /></span>;
            else if (t.state === "locked") node = <span className="grid size-7 place-items-center rounded-full border border-dashed border-line-strong bg-paper text-muted"><Icon name="lock" size={12} /></span>;
            else if (bad) node = <span className="grid size-7 place-items-center rounded-full border-2 border-bad bg-bad-soft text-bad"><Icon name="alert" size={14} /></span>;
            else node = <span className="block size-7 rounded-full border-2 border-line-strong bg-surface" />;
            return (
              <Fragment key={t.id}>
                {showSurgeryDay && (
                  <li className="relative pb-6 ps-11">
                    <span className="absolute start-0 top-0 grid size-7 place-items-center rounded-full bg-accent text-surface" aria-hidden="true"><span className="size-2 rounded-full bg-surface" /></span>
                    <span className="absolute start-[13px] top-7 bottom-0 w-px bg-line" aria-hidden="true" />
                    <p className="display text-lg">{tr("יום הניתוח")}</p>
                    <p className="text-sm text-muted">{formatDateLong(journey.surgery_date, lang)}</p>
                  </li>
                )}
                <li className="relative pb-6 ps-11" aria-current={isNow ? "step" : undefined}>
                  <span className="absolute start-0 top-0" aria-hidden="true">{node}</span>
                  {idx < visibleTasks.length - 1 && <span className="absolute start-[13px] top-8 bottom-0 w-px bg-line" aria-hidden="true" />}
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`break-words font-medium leading-snug ${t.state === "done" || t.state === "locked" ? "text-muted" : ""}`}>{t.title}</p>
                        {!t.mandatory && <span className="pill pill-neutral">{tr("רשות")}</span>}
                      </div>
                      <p className={`mt-0.5 text-sm ${bad ? "text-bad" : "text-muted"}`}>
                        {t.kind === "appointment" ? tr("תור") : ownerLabel(t.owner, tr)} ·{" "}
                        {t.kind === "appointment"
                          ? t.scheduled_at ? `${formatDate(t.eventDate, lang)} ${t.eventTime}` : tr("טרם נקבע מועד")
                          : tr("יעד {date}", { date: formatDate(t.dueDate, lang) })}
                      </p>
                      {t.state === "locked" && (
                        <p className="mt-0.5 text-sm text-muted">{tr("ממתין ל: {list}", { list: t.blockedBy.map((b) => b.title).join(", ") })}</p>
                      )}
                    </div>
                    <LiveTaskPill taskId={t.id} state={t.state} overdue={t.overdue} />
                  </div>
                  {(t.patient_note || t.evidence_name || t.review_note || (t.submitted_by && cgByUser.has(t.submitted_by))) && (
                    <div className="mt-2 space-y-1 text-sm">
                      {t.evidence_name && (
                        <div>
                          {urls.get(t.id) && /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(t.evidence_name) && (
                            <a href={urls.get(t.id)} target="_blank" rel="noreferrer" className="mb-1.5 block w-fit">
                              <img
                                src={urls.get(t.id)}
                                alt={tr("תמונה שהועלתה: {name}", { name: t.evidence_name })}
                                loading="lazy"
                                className="max-h-48 w-auto rounded-xl border border-line object-contain"
                              />
                            </a>
                          )}
                          <p className="flex items-center gap-2 break-words">
                            <Icon name="file" />
                            {urls.get(t.id) ? (
                              <a href={urls.get(t.id)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center break-all underline underline-offset-4 sm:min-h-0">{t.evidence_name}</a>
                            ) : t.evidence_name}
                          </p>
                        </div>
                      )}
                      {t.submitted_by && cgByUser.get(t.submitted_by) && (
                        <p className="text-muted">
                          {tr("הוגש על ידי {name} ({relation})", { name: cgByUser.get(t.submitted_by)!.full_name, relation: cgByUser.get(t.submitted_by)!.relation })}
                        </p>
                      )}
                      {t.patient_note && <p className="text-muted">{tr("הערת המטופל: {note}", { note: t.patient_note })}</p>}
                      {t.review_note && <p className="text-bad">{tr("הערת הצוות: {note}", { note: t.review_note })}</p>}
                    </div>
                  )}

                  {t.kind === "appointment" && t.state !== "done" && (
                    <ScheduleControl
                      taskId={t.id}
                      initialLocal={t.scheduled_at ? (({ date, time }) => `${date}T${time}`)(israelParts(t.scheduled_at)) : ""}
                      initialLocation={t.location ?? ""}
                    />
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <TaskReview taskId={t.id} state={t.state} owner={t.owner} />
                    {t.owner === "patient" && (t.state === "todo" || t.state === "rejected") && (
                      <div className="mt-3">
                        <ReminderButton
                          phone={journey.patient.phone}
                          email={patientRow?.email}
                          subject={tr("תזכורת מ{clinic}", { clinic: clinicName })}
                          message={taskReminderMessage(journey.patient.full_name, clinicName, t.title, `${origin}/journey`, extras?.lang ?? "he")}
                        />
                      </div>
                    )}
                  </div>
                </li>
              </Fragment>
            );
          })}
        </ol>
      </section>

      <PromsCard journeyId={journey.id} />

      <AllDocuments items={allDocs} />

      <section>
        <h2 className="eyebrow mb-3">{tr("היסטוריה")}</h2>
        <ActivityList items={history} showPatient={false} />
        {(historyRows ?? []).length >= 20 && <p className="mt-2 text-xs text-muted">{tr("מוצגות 20 הפעולות האחרונות בלבד.")}</p>}
      </section>
      </div>

      <aside className="min-w-0 space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-6 lg:pe-1 [scrollbar-width:thin]">
        <section aria-label={tr("פרטי המטופל")} className="relative">
          {/* The title sits above the box, so the box starts level with the summary card. */}
          <h2 className="eyebrow absolute bottom-full mb-1">{tr("פרטי המטופל")}</h2>
          <PatientDetails patientId={journey.patient_id} name={journey.patient.full_name} phone={journey.patient.phone ?? ""} email={patientRow?.email ?? ""} hospital={placement?.hospital ?? ""} company={placement?.company ?? ""}
            nationalId={medicalInfo?.national_id ?? ""} hmo={medicalInfo?.hmo ?? ""} insuranceCompany={medicalInfo?.insurance_company ?? ""} insurancePolicyNumber={medicalInfo?.insurance_policy_number ?? ""} insurancePhone={medicalInfo?.insurance_phone ?? ""}
            hospitals={options.hospitals} companies={options.companies}
            autoStage={autoStage} stage={extras?.stage ?? null} lang={extras?.lang ?? "he"}
            journeyEdit={<Link href={`/clinic/patients/${id}/edit`} className="btn btn-sm min-h-11 !px-3 sm:min-h-9">{tr("עריכת המסלול של המטופל")}</Link>} />
          <StartJourney patientId={journey.patient_id} templates={templates ?? []} />
          <InvitationPanel patientId={journey.patient_id} joined={!!patientRow?.user_id} />
        </section>
        <section aria-label={tr("קליני")} className="space-y-6">
          <h2 className="eyebrow">{tr("קליני")}</h2>
          <ClinicalSummary journeyId={journey.id} procedure={journey.procedure || journey.template_name} hospital={placement?.hospital ?? ""} data={clinical} canEdit={isDoctor} available={clinicalAvailable} />
          <DoctorQuestions patientId={journey.patient_id} journeyId={journey.id} items={questions} isDoctor={isDoctor} myId={profile.id} available={questionsAvailable} />
          <MeetingSummaries patientId={journey.patient_id} items={summaries} appointments={appointmentOptions} />
          <section id="referrals" aria-label={tr("הפניות")} className="scroll-mt-4">
            <h3 className="eyebrow mb-2">{tr("הפניות")}</h3>
            <ReferralsCard
              patientId={journey.patient_id}
              canCreate={isDoctor}
              items={referrals.map((r) => ({
                id: r.id, recipient: r.recipient, reason: r.reason, createdAt: r.created_at,
                resultStatus: r.result_status ?? "pending", resultName: r.result_name ?? null, resultUrl: resultUrls.get(r.id) ?? null,
              }))}
            />
          </section>
        </section>
        <section aria-label={tr("בני משפחה")}>
          <h2 className="eyebrow mb-2">{tr("בני משפחה")}</h2>
          <CaregiverList
            isPatient={false}
            items={(caregivers ?? []).map((c) => ({
              id: c.id, name: c.full_name, relation: c.relation, canAct: c.can_act,
              since: israelParts(c.created_at).date.split("-").reverse().join("."),
            }))}
          />
          <PendingInvites
            items={(openInvites ?? []).map((i) => ({
              id: i.id, name: i.invitee_name ?? "", relation: i.relation, canAct: i.can_act,
              expires: israelParts(i.expires_at).date.split("-").reverse().join("."),
              expired: i.expires_at < new Date().toISOString(),
            }))}
          />
          <AddCaregiver patientId={journey.patient_id} />
          <p className="mt-2 text-xs text-muted">{tr("בני משפחה מוזמנים על ידי המטופל או על ידי הצוות. הצוות יכול להסיר גישה.")}</p>
        </section>
        {!cancelRow?.cancelled_at && <CancelTrigger journeyId={journey.id} />}
      </aside>
      </div>
      {isDoctor && (
        <>
          <div aria-hidden className="h-16 md:hidden" />
          <DoctorQuickBar patientId={journey.patient_id} phone={journey.patient.phone ?? ""} openQuestions={questions.filter((q) => !q.answeredAt).length} />
        </>
      )}
    </main>
  );
}
