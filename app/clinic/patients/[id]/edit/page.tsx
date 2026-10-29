import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { loadJourney, TASK_COLUMNS } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { EditorTask } from "@/components/editor/types";
import type { TaskRow } from "@/lib/journey";
import { Icon } from "@/components/ui";
import { israelParts } from "@/lib/dates";
import { JourneyEditForm } from "./form";

export const dynamic = "force-dynamic";

export default async function EditJourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [, journey, { data }] = await Promise.all([
    requireProfile(["staff", "doctor"]),
    loadJourney(id),
    supabase.from("journey_tasks").select(TASK_COLUMNS).eq("journey_id", id).order("position"),
  ]);
  if (!journey) notFound();
  const tasks: EditorTask[] = ((data ?? []) as TaskRow[]).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    owner: r.owner,
    due_offset_days: r.due_offset_days,
    requires_evidence: r.requires_evidence,
    requires_review: r.requires_review,
    mandatory: r.mandatory,
    depends_on: r.depends_on,
    kind: r.kind,
    location: r.location ?? "",
    scheduled_local: r.scheduled_at ? (({ date, time }) => `${date}T${time}`)(israelParts(r.scheduled_at)) : "",
    status: r.status,
  }));

  return (
    <main className="max-w-3xl">
      <Link href={`/clinic/patients/${id}`} className="back-link">
        <Icon name="arrow" size={14} /> חזרה למטופל
      </Link>
      <p className="eyebrow">עריכה למטופל זה בלבד</p>
      <h1 className="display mt-1 text-4xl">{journey.patient.full_name}</h1>
      <p className="mt-2 max-w-xl text-muted">
        השינויים כאן חלים רק על המסלול של המטופל. התבנית המקורית ומטופלים אחרים לא משתנים. התקדמות קיימת נשמרת.
      </p>
      <JourneyEditForm journeyId={id} surgeryDate={journey.surgery_date} initialTasks={tasks} />
    </main>
  );
}
