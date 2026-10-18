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
const JOURNEY_SELECT = `id, patient_id, surgery_date, template_name, patients(id, full_name, phone), journey_tasks(${TASK_COLUMNS})`;

type JourneyRow = {
  id: string;
  patient_id: string;
  surgery_date: string;
  template_name: string;
  patients: JourneyInfo["patient"] | JourneyInfo["patient"][] | null;
  journey_tasks: TaskRow[] | null;
};

function toJourney(j: JourneyRow): PatientJourney {
  const patient = (Array.isArray(j.patients) ? j.patients[0] : j.patients) as JourneyInfo["patient"];
  return {
    id: j.id,
    patient_id: j.patient_id,
    surgery_date: j.surgery_date,
    template_name: j.template_name,
    patient,
    summary: summarize(j.journey_tasks ?? [], j.surgery_date),
  };
}

// All journeys of the caller's clinic (staff) or the caller's own journey (patient), with readiness.
// Journeys and their tasks come back in a single request.
export async function loadJourneys(): Promise<PatientJourney[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("journeys").select(JOURNEY_SELECT).order("surgery_date");
  return ((data ?? []) as unknown as JourneyRow[]).map(toJourney);
}

export async function loadJourney(journeyId: string): Promise<PatientJourney | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("journeys").select(JOURNEY_SELECT).eq("id", journeyId).maybeSingle();
  return data ? toJourney(data as unknown as JourneyRow) : null;
}
