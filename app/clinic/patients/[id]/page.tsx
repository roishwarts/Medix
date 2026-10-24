import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadJourney } from "@/lib/queries";
import { OWNER_LABEL } from "@/lib/journey";
import { formatDate, formatDateLong, israelParts, relativeDays } from "@/lib/dates";
import { Icon, ReadinessBar, TaskStatePill } from "@/components/ui";
import { TaskReview } from "./task-review";
import { ScheduleControl } from "./schedule-control";
import { CaregiverList } from "@/components/caregiver-list";
import { PatientDetails } from "./patient-details";
import { InvitationPanel } from "./invitation-panel";
import { AddCaregiver } from "./add-caregiver";
import { PendingInvites } from "./pending-invites";
import { ActivityList } from "@/components/activity-list";
import { toItems, type ActivityRow } from "@/lib/activity";

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
  const { status } = await searchParams;
  const active: FilterKey = FILTERS.some(([k]) => k === status) ? (status as FilterKey) : "all";
  const profile = await requireProfile(["staff", "doctor"]);
  const journey = await loadJourney(id);
  if (!journey) notFound();
  const { summary } = journey;
  const matches = (t: (typeof summary.tasks)[number], key: FilterKey) =>
    key === "all" || (key === "overdue" ? t.overdue : t.state === key);
  const visibleTasks = summary.tasks.filter((t) => matches(t, active));

  const supabase = await createClient();
  const { data: caregivers } = await supabase
    .from("patient_caregivers")
    .select("id, user_id, full_name, relation, can_act, created_at")
    .eq("patient_id", journey.patient_id)
    .order("created_at");
  const { data: patientRow } = await supabase.from("patients").select("user_id, email").eq("id", journey.patient_id).maybeSingle();
  const { data: openInvites } = await supabase
    .from("caregiver_invites")
    .select("id, invitee_name, relation, can_act, expires_at")
    .eq("patient_id", journey.patient_id)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  const { data: historyRows } = await supabase
    .from("activity_events")
    .select("id, kind, actor_id, actor_name, actor_role, subject, detail, created_at, patient_id, journey_id")
    .eq("patient_id", journey.patient_id)
    .order("created_at", { ascending: false })
    .limit(20);
  const history = toItems((historyRows ?? []) as ActivityRow[], {
    patientNames: new Map(),
    journeyByPatient: new Map([[journey.patient_id, id]]),
    me: "",
    seenAt: new Date().toISOString(),
  });
  const cgByUser = new Map((caregivers ?? []).map((c) => [c.user_id as string, c]));
  const urls = new Map<string, string>();
  await Promise.all(
    summary.tasks
      .filter((t) => t.evidence_path)
      .map(async (t) => {
        const { data } = await supabase.storage.from("evidence").createSignedUrl(t.evidence_path!, 600);
        if (data?.signedUrl) urls.set(t.id, data.signedUrl);
      }),
  );

  return (
    <main>
      <Link href="/clinic/patients" className="back-link">
        <Icon name="arrow" size={14} /> כל המטופלים
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="display text-4xl">{journey.patient.full_name}</h1>
          <p className="mt-1 text-muted">{journey.procedure || journey.template_name}</p>
          <p className="mt-3">
            ניתוח: <span className="font-medium">{formatDateLong(journey.surgery_date)}</span>{" "}
            <span className="text-muted">({relativeDays(journey.surgery_date)})</span>
          </p>
        </div>
        <div className="w-full max-w-xs">
          <div className="flex items-center gap-3">
            <span className="num text-sm font-medium">{summary.readiness}%</span>
            <div className="flex-1"><ReadinessBar value={summary.readiness} state={summary.readinessState} /></div>
          </div>
          <Link href={`/clinic/patients/${id}/edit`} className="btn btn-sm mt-4 w-full">עריכת המסלול של המטופל</Link>
        </div>
      </div>

      {summary.topBlocker && (
        <section className="mt-8">
          <h2 className="eyebrow mb-2">שלב נוכחי</h2>
          <div className="card flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>{summary.topBlocker.label}</span>
            <span className="shrink-0 text-muted">{formatDate(summary.topBlocker.task.dueDate)}</span>
          </div>
          {summary.blockers.length > 1 && (
            <p className="mt-2 text-xs text-muted">ועוד {summary.blockers.length - 1} משימות פתוחות ברשימה למטה</p>
          )}
        </section>
      )}

      <details className="fold mt-8">
        <summary>
          <span className="font-medium">פרטי המטופל ובני משפחה</span>
          <span className="text-sm text-muted">{(caregivers ?? []).length > 0 ? `${(caregivers ?? []).length} בני משפחה` : ""}</span>
        </summary>
        <div className="pt-4">
        <PatientDetails patientId={journey.patient_id} name={journey.patient.full_name} phone={journey.patient.phone ?? ""} email={patientRow?.email ?? ""} />
        <InvitationPanel patientId={journey.patient_id} joined={!!patientRow?.user_id} />
        <h3 className="eyebrow mb-2 mt-6">בני משפחה</h3>
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
        <p className="mt-2 text-xs text-muted">בני משפחה מוזמנים על ידי המטופל או על ידי הצוות. הצוות יכול להסיר גישה.</p>
        </div>
      </details>

      <section className="mt-10">
        <h2 className="eyebrow mb-1">כל המשימות</h2>
        <nav aria-label="סינון משימות לפי סטטוס" className="chip-row">
          {FILTERS.map(([key, label]) => {
            const count = summary.tasks.filter((t) => matches(t, key)).length;
            const on = key === active;
            return (
              <Link
                key={key}
                href={key === "all" ? `/clinic/patients/${id}` : `/clinic/patients/${id}?status=${key}`}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className="chip"
              >
                {label} <span className="num text-xs">{count}</span>
              </Link>
            );
          })}
        </nav>
        {visibleTasks.length === 0 && <p className="card px-4 py-8 text-center text-muted">אין משימות בסטטוס הזה.</p>}
        <div className={`card divide-y divide-line ${visibleTasks.length === 0 ? "hidden" : ""}`}>
          {visibleTasks.map((t) => (
            <div key={t.id} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{t.title}</p>
                    {!t.mandatory && <span className="pill pill-neutral">רשות</span>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {t.kind === "appointment" ? "תור" : OWNER_LABEL[t.owner]} ·{" "}
                    {t.kind === "appointment"
                      ? t.scheduled_at ? `${formatDate(t.eventDate)} ${t.eventTime}` : "טרם נקבע מועד"
                      : `יעד ${formatDate(t.dueDate)}`}
                    {t.state === "locked" && ` · ממתין ל: ${t.blockedBy.map((b) => b.title).join(", ")}`}
                  </p>
                </div>
                <TaskStatePill state={t.state} overdue={t.overdue} />
              </div>

              {(t.patient_note || t.evidence_name || t.review_note || (t.submitted_by && cgByUser.has(t.submitted_by))) && (
                <div className="mt-3 space-y-1 text-sm">
                  {t.evidence_name && (
                    <p className="flex items-center gap-2">
                      <Icon name="file" />
                      {urls.get(t.id) ? (
                        <a href={urls.get(t.id)} target="_blank" rel="noreferrer" className="underline underline-offset-4">{t.evidence_name}</a>
                      ) : t.evidence_name}
                    </p>
                  )}
                  {t.submitted_by && cgByUser.get(t.submitted_by) && (
                    <p className="text-muted">
                      הוגש על ידי {cgByUser.get(t.submitted_by)!.full_name} ({cgByUser.get(t.submitted_by)!.relation})
                    </p>
                  )}
                  {t.patient_note && <p className="text-muted">הערת המטופל: {t.patient_note}</p>}
                  {t.review_note && <p className="text-bad">הערת הצוות: {t.review_note}</p>}
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
        <h2 className="eyebrow mb-3">היסטוריה</h2>
        <ActivityList items={history} showPatient={false} />
      </section>
    </main>
  );
}
