import { createClient } from "./supabase/server";
import { summarize, type JourneySummary, type TaskRow } from "./journey";

export const TASK_COLUMNS =
  "id, journey_id, title, description, owner, due_offset_days, requires_evidence, requires_review, mandatory, position, depends_on, kind, location, scheduled_at, status, evidence_path, evidence_name, patient_note, review_note, submitted_by, submitted_at, reviewed_at";

export type JourneyInfo = {
  id: string;
  patient_id: string;
  surgery_date: string;
  template_name: string;
  patient: { id: string; full_name: string; phone: string | null };
};

export type PatientJourney = JourneyInfo & { summary: JourneySummary };

// All journeys of the caller's clinic (staff) or the caller's own journey (patient), with readiness.
export async function loadJourneys(): Promise<PatientJourney[]> {
  const supabase = await createClient();
  const { data: journeys } = await supabase
    .from("journeys")
    .select("id, patient_id, surgery_date, template_name, patients(id, full_name, phone)")
    .order("surgery_date");
  if (!journeys?.length) return [];

  const { data: tasks } = await supabase
    .from("journey_tasks")
    .select(TASK_COLUMNS)
    .in("journey_id", journeys.map((j) => j.id));

  const byJourney = new Map<string, TaskRow[]>();
  for (const t of (tasks ?? []) as TaskRow[]) {
    const list = byJourney.get(t.journey_id) ?? [];
    list.push(t);
    byJourney.set(t.journey_id, list);
  }

  return journeys.map((j) => {
    const patient = (Array.isArray(j.patients) ? j.patients[0] : j.patients) as JourneyInfo["patient"];
    return {
      id: j.id,
      patient_id: j.patient_id,
      surgery_date: j.surgery_date,
      template_name: j.template_name,
      patient,
      summary: summarize(byJourney.get(j.id) ?? [], j.surgery_date),
    };
  });
}

export async function loadJourney(journeyId: string): Promise<PatientJourney | null> {
  const supabase = await createClient();
  const { data: j } = await supabase
    .from("journeys")
    .select("id, patient_id, surgery_date, template_name, patients(id, full_name, phone)")
    .eq("id", journeyId)
    .maybeSingle();
  if (!j) return null;
  const { data: tasks } = await supabase.from("journey_tasks").select(TASK_COLUMNS).eq("journey_id", journeyId);
  const patient = (Array.isArray(j.patients) ? j.patients[0] : j.patients) as JourneyInfo["patient"];
  return {
    id: j.id,
    patient_id: j.patient_id,
    surgery_date: j.surgery_date,
    template_name: j.template_name,
    patient,
    summary: summarize((tasks ?? []) as TaskRow[], j.surgery_date),
  };
}
