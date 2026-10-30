import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadJourney } from "@/lib/queries";
import { ownerLabel, blockerLabel } from "@/lib/journey";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { formatDate, formatDateLong, israelParts, relativeDays } from "@/lib/dates";
import { Icon, ReadinessBar } from "@/components/ui";
import { LiveTaskPill } from "@/components/task-optimistic";
import { TaskReview } from "./task-review";
import { ScheduleControl } from "./schedule-control";
import { CaregiverList } from "@/components/caregiver-list";
import { PatientDetails } from "./patient-details";
import { PatientSettings } from "./patient-settings";
import { loadPatientExtras } from "@/lib/patient-extras";
import { stageOf } from "@/lib/journey";
import { InvitationPanel } from "./invitation-panel";
import { AddCaregiver } from "./add-caregiver";
import { PendingInvites } from "./pending-invites";
import { ActivityList } from "@/components/activity-list";
import { toItems, type ActivityRow } from "@/lib/activity";
import { getClinicOptions } from "@/lib/clinic-options";

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
  const [profile, journey, options] = await Promise.all([
    requireProfile(["staff", "doctor"]),
    loadJourney(id),
    getClinicOptions(),
  ]);
  void profile;
  if (!journey) notFound();
  const { summary } = journey;
  const matches = (t: (typeof summary.tasks)[number], key: FilterKey) =>
    key === "all" || (key === "overdue" ? t.overdue : t.state === key);
  const visibleTasks = summary.tasks.filter((t) => matches(t, active));

  const [{ data: caregivers }, { data: patientRow }, { data: placement }, { data: openInvites }, { data: historyRows }, urlEntries] = await Promise.all([
    supabase
      .from("patient_caregivers")
      .select("id, user_id, full_name, relation, can_act, created_at")
      .eq("patient_id", journey.patient_id)
      .order("created_at"),
    supabase.from("patients").select("user_id, email").eq("id", journey.patient_id).maybeSingle(),
    // Separate query so the page still works before the hospital/company patch is applied.
    supabase.from("patients").select("hospital, company").eq("id", journey.patient_id).maybeSingle(),
    supabase
      .from("caregiver_invites")
      .select("id, invitee_name, relation, can_act, expires_at")
      .eq("patient_id", journey.patient_id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
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
  ]);
  const extras = (await loadPatientExtras()).get(journey.patient_id);
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

  return (
    <main>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="display text-3xl sm:text-4xl">{journey.patient.full_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-muted">{journey.procedure || journey.template_name}</p>
            <Link href={`/clinic/patients/${id}/edit`} className="btn btn-sm min-h-11 px-4 text-sm sm:min-h-9">{tr("עריכת המסלול של המטופל")}</Link>
          </div>
          {(placement?.hospital || placement?.company) && (
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {placement?.hospital && <span><span className="text-muted">{tr("בית חולים:")}</span> <span className="font-medium">{placement.hospital}</span></span>}
              {placement?.company && <span><span className="text-muted">{tr("חברה:")}</span> <span className="font-medium">{placement.company}</span></span>}
            </p>
          )}
          <p className="mt-3">
            {tr("ניתוח:")} <span className="font-medium">{formatDateLong(journey.surgery_date, lang)}</span>{" "}
            <span className="text-muted">({relativeDays(journey.surgery_date, undefined, lang)})</span>
          </p>
        </div>
        <div className="w-full sm:max-w-xs">
          <p className="mb-1 text-sm text-muted">{tr("מוכנות לניתוח")}</p>
          <div className="flex items-center gap-3">
            <span className="num text-sm font-medium">{summary.readiness}%</span>
            <div className="flex-1"><ReadinessBar value={summary.readiness} state={summary.readinessState} /></div>
          </div>
        </div>
      </div>

      <PatientSettings patientId={journey.patient_id} autoStage={stageOf(summary)} stage={extras?.stage ?? null} lang={extras?.lang ?? "he"} />

      {summary.topBlocker && (
        <section className="mt-8">
          <h2 className="eyebrow mb-2">{tr("שלב נוכחי")}</h2>
          <div className="card flex items-center justify-between gap-3 px-4 py-3">
            <span>{blockerLabel(summary.topBlocker, tr)}</span>
            <span className="shrink-0 text-sm text-muted">{tr("יעד {date}", { date: formatDate(summary.topBlocker.task.dueDate, lang) })}</span>
          </div>
        </section>
      )}

      <details className="fold mt-8">
        <summary>
          <span className="font-medium">{tr("פרטי המטופל ובני משפחה")}</span>
          <span className="text-sm text-muted">{(caregivers ?? []).length > 0 ? tr("{n} בני משפחה", { n: (caregivers ?? []).length }) : ""}</span>
        </summary>
        <div className="pt-4">
        <PatientDetails patientId={journey.patient_id} name={journey.patient.full_name} phone={journey.patient.phone ?? ""} email={patientRow?.email ?? ""} hospital={placement?.hospital ?? ""} company={placement?.company ?? ""} hospitals={options.hospitals} companies={options.companies} />
        <InvitationPanel patientId={journey.patient_id} joined={!!patientRow?.user_id} />
        <h3 className="eyebrow mb-2 mt-6">{tr("בני משפחה")}</h3>
        <CaregiverList
          isPatient={false}
          items={(caregivers ?? []).map((c) => ({
            id: c.id,
            name: c.full_name,
            relation: c.relation,
            canAct: c.can_act,
            since: israelParts(c.created_at).date.split("-").reverse().join("."),
          }))}
        />
        <PendingInvites
          items={(openInvites ?? []).map((i) => ({
            id: i.id,
            name: i.invitee_name ?? "",
            relation: i.relation,
            canAct: i.can_act,
            expires: israelParts(i.expires_at).date.split("-").reverse().join("."),
          }))}
        />
        <AddCaregiver patientId={journey.patient_id} />
        <p className="mt-2 text-xs text-muted">{tr("בני משפחה מוזמנים על ידי המטופל או על ידי הצוות. הצוות יכול להסיר גישה.")}</p>
        </div>
      </details>

      <section className="mt-10">
        <h2 className="eyebrow mb-1">{tr("כל המשימות")}</h2>
        <nav aria-label={tr("סינון משימות לפי סטטוס")} className="chip-row">
          {FILTERS.map(([key, label]) => {
            const count = summary.tasks.filter((t) => matches(t, key)).length;
            const on = key === active;
            return (
              <Link
                key={key}
                href={key === "all" ? `/clinic/patients/${id}` : `/clinic/patients/${id}?status=${key}`}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className="chip min-h-11"
              >
                {tr(label)} <span className="num text-xs">{count}</span>
              </Link>
            );
          })}
        </nav>
        {visibleTasks.length === 0 && <p className="card px-4 py-8 text-center text-muted">{tr("אין משימות בסטטוס הזה.")}</p>}
        <div className={`card divide-y divide-line ${visibleTasks.length === 0 ? "hidden" : ""}`}>
          {visibleTasks.map((t) => (
            <div key={t.id} className={`px-4 py-4 ${t.state === "review" ? "border-s-4 border-s-warn bg-warn/5" : t.state === "rejected" || t.overdue ? "border-s-4 border-s-bad" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words font-medium">{t.title}</p>
                    {!t.mandatory && <span className="pill pill-neutral">{tr("רשות")}</span>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {t.kind === "appointment" ? tr("תור") : ownerLabel(t.owner, tr)} ·{" "}
                    {t.kind === "appointment"
                      ? t.scheduled_at ? `${formatDate(t.eventDate, lang)} ${t.eventTime}` : tr("טרם נקבע מועד")
                      : tr("יעד {date}", { date: formatDate(t.dueDate, lang) })}
                    {t.state === "locked" && ` · ${tr("ממתין ל: {list}", { list: t.blockedBy.map((b) => b.title).join(", ") })}`}
                  </p>
                </div>
                <LiveTaskPill taskId={t.id} state={t.state} overdue={t.overdue} />
              </div>

              {(t.patient_note || t.evidence_name || t.review_note || (t.submitted_by && cgByUser.has(t.submitted_by))) && (
                <div className="mt-3 space-y-1 text-sm">
                  {t.evidence_name && (
                    <p className="flex items-center gap-2 break-words">
                      <Icon name="file" />
                      {urls.get(t.id) ? (
                        <a href={urls.get(t.id)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center break-all underline underline-offset-4 sm:min-h-0">{t.evidence_name}</a>
                      ) : t.evidence_name}
                    </p>
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
              <TaskReview taskId={t.id} state={t.state} owner={t.owner} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="eyebrow mb-3">{tr("היסטוריה")}</h2>
        <ActivityList items={history} showPatient={false} />
      </section>
    </main>
  );
}
