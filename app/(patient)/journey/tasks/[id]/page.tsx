import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadJourneys } from "@/lib/queries";
import { getCaregiverLink, getProfile } from "@/lib/auth";
import { OWNER_LABEL } from "@/lib/journey";
import { formatDate, relativeDays } from "@/lib/dates";
import { Icon, TaskStatePill } from "@/components/ui";
import { SubmitPanel } from "./submit-panel";

export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [journey] = await loadJourneys();
  const task = journey?.summary.tasks.find((t) => t.id === id);
  if (!journey || !task) notFound();

  let fileUrl: string | null = null;
  if (task.evidence_path) {
    const supabase = await createClient();
    const { data } = await supabase.storage.from("evidence").createSignedUrl(task.evidence_path, 600);
    fileUrl = data?.signedUrl ?? null;
  }

  const profile = await getProfile();
  const caregiver = profile?.role === "caregiver" ? await getCaregiverLink() : null;
  const mayAct = profile?.role === "patient" || !!caregiver?.can_act;
  const mine = task.owner === "patient";
  const canSubmit = mayAct && mine && (task.state === "todo" || task.state === "rejected");

  return (
    <main>
      <Link href="/journey" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <Icon name="arrow" size={14} /> חזרה למסע
      </Link>

      <div className="flex items-center gap-2">
        <TaskStatePill state={task.state} overdue={task.overdue} />
        <span className="text-sm text-muted">באחריות {OWNER_LABEL[task.owner]}</span>
      </div>
      <h1 className="display mt-3 text-3xl">{task.title}</h1>
      {task.description && <p className="mt-3 text-lg text-muted">{task.description}</p>}

      <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-line py-4 text-sm">
        <div>
          <dt className="eyebrow">{task.kind === "appointment" ? "מועד התור" : "מועד יעד"}</dt>
          <dd className="mt-0.5 font-medium">
            {formatDate(task.eventDate)}
            {task.eventTime && <> · <span className="num">{task.eventTime}</span></>} · {relativeDays(task.eventDate)}
            {task.kind === "appointment" && task.location && <span className="block font-normal text-muted">{task.location}</span>}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">נדרש</dt>
          <dd className="mt-0.5 font-medium">
            {task.kind === "appointment" ? "הגעה למרפאה" : task.requires_evidence ? "העלאת מסמך" : task.requires_review ? "אישור הצוות" : mine ? "סימון שבוצע" : "טיפול הצוות"}
          </dd>
        </div>
      </dl>

      {task.state === "locked" && (
        <div className="mt-6 flex gap-3 rounded border border-dashed border-line-strong p-4 text-muted">
          <Icon name="lock" size={18} />
          <div>
            <p className="font-medium text-ink">המשימה עדיין נעולה</p>
            <p className="mt-0.5 text-sm">היא תיפתח אחרי: {task.blockedBy.map((b) => b.title).join(", ")}.</p>
          </div>
        </div>
      )}

      {task.state === "rejected" && task.review_note && (
        <div className="mt-6 rounded bg-bad-soft p-4 text-bad">
          <p className="font-medium">הצוות החזיר את המשימה לתיקון</p>
          <p className="mt-0.5 text-sm">{task.review_note}</p>
        </div>
      )}

      {task.state === "review" && (
        <div className="mt-6 rounded bg-warn-soft p-4 text-warn">
          <p className="font-medium">נשלח וממתין לבדיקת הצוות</p>
          {task.evidence_name && <p className="mt-0.5 text-sm">{task.evidence_name}</p>}
        </div>
      )}

      {task.state === "done" && (
        <div className="mt-6 rounded bg-ok-soft p-4 text-ok">
          <p className="flex items-center gap-2 font-medium"><Icon name="check" /> המשימה אושרה</p>
        </div>
      )}

      {fileUrl && (
        <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm underline underline-offset-4">
          <Icon name="file" /> {task.evidence_name ?? "הקובץ ששלחת"}
        </a>
      )}

      {canSubmit && (
        <SubmitPanel
          taskId={task.id}
          journeyId={journey.id}
          requiresEvidence={task.requires_evidence}
          needsReview={task.requires_review || task.requires_evidence}
        />
      )}
    </main>
  );
}
