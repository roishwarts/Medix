import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadJourney } from "@/lib/queries";
import { OWNER_LABEL } from "@/lib/journey";
import { formatDate, formatDateLong, israelParts, relativeDays } from "@/lib/dates";
import { Icon, ReadinessBar, ReadinessPill, TaskStatePill } from "@/components/ui";
import { TaskReview } from "./task-review";
import { ScheduleControl } from "./schedule-control";
import { CaregiverList } from "@/components/caregiver-list";

export const dynamic = "force-dynamic";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile(["staff", "doctor"]);
  const journey = await loadJourney(id);
  if (!journey) notFound();
  const { summary } = journey;

  const supabase = await createClient();
  const { data: caregivers } = await supabase
    .from("patient_caregivers")
    .select("id, user_id, full_name, relation, can_act, created_at")
    .eq("patient_id", journey.patient_id)
    .order("created_at");
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
      <Link href="/clinic/patients" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <Icon name="arrow" size={14} /> כל המטופלים
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="display text-4xl">{journey.patient.full_name}</h1>
          <p className="mt-1 text-muted">
            {journey.template_name}
            {journey.patient.phone && <> · <span dir="ltr" className="num">{journey.patient.phone}</span></>}
          </p>
          <p className="mt-3">
            ניתוח: <span className="font-medium">{formatDateLong(journey.surgery_date)}</span>{" "}
            <span className="text-muted">({relativeDays(journey.surgery_date)})</span>
          </p>
        </div>
        <div className="w-full max-w-xs">
          <div className="flex items-baseline justify-between">
            <span className="display num text-5xl">{summary.readiness}%</span>
            <ReadinessPill state={summary.readinessState} />
          </div>
          <div className="mt-2"><ReadinessBar value={summary.readiness} state={summary.readinessState} /></div>
          {profile.role === "doctor" && (
            <Link href={`/clinic/patients/${id}/edit`} className="btn btn-sm mt-4 w-full">עריכת המסלול של המטופל</Link>
          )}
        </div>
      </div>

      {summary.blockers.length > 0 && (
        <section className="mt-8">
          <h2 className="eyebrow mb-2">שלב נוכחי</h2>
          <ul className="card divide-y divide-line">
            {summary.blockers.map((b) => (
              <li key={b.task.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>{b.label}</span>
                <span className="text-muted">{formatDate(b.task.dueDate)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="eyebrow mb-3">בני משפחה</h2>
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
        <p className="mt-2 text-xs text-muted">בני משפחה מוזמנים על ידי המטופל. הצוות יכול להסיר גישה.</p>
      </section>

      <section className="mt-10">
        <h2 className="eyebrow mb-3">כל המשימות</h2>
        <div className="card divide-y divide-line">
          {summary.tasks.map((t) => (
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
    </main>
  );
}
