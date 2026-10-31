import { createClient } from "./supabase/server";
import { summarize, type JourneySummary, type TaskRow } from "./journey";

export const TASK_COLUMNS =
  "id, journey_id, title, description, owner, due_offset_days, requires_evidence, requires_review, mandatory, position, depends_on, kind, location, scheduled_at, status, evidence_path, evidence_name, patient_note, review_note, submitted_by, submitted_at, reviewed_at";

export type JourneyInfo = {
  id: string;
  patient_id: string;
  surgery_date: string;
  template_name: string;
  template_id: string | null;
  procedure: string | null;
  patient_info: string | null;
  red_flags: string | null;
  cancelled_at: string | null;
  patient: { id: string; full_name: string; phone: string | null };
};

export type PatientJourney = JourneyInfo & { summary: JourneySummary };

// All journeys of the caller's clinic (staff) or the caller's own journey (patient), with readiness.
// patient_info (patch-patient-content.sql), red_flags (patch-red-flags.sql) and cancelled_at
// (patch-outcomes.sql) may not exist yet on an older database, so each is dropped from the select
// in turn, newest first, until one succeeds.
const journeySelect = (tier: number) =>
  `id, patient_id, surgery_date, template_name, template_id, ${tier >= 3 ? "cancelled_at, " : ""}${tier >= 2 ? "red_flags, " : ""}${tier >= 1 ? "patient_info, " : ""}patients(id, full_name, phone), templates(procedure), journey_tasks(${TASK_COLUMNS})`;

type JourneyRow = {
  id: string;
  patient_id: string;
  surgery_date: string;
  template_name: string;
  template_id: string | null;
  patient_info?: string | null;
  red_flags?: string | null;
  cancelled_at?: string | null;
  patients: JourneyInfo["patient"] | JourneyInfo["patient"][] | null;
  templates: { procedure: string | null } | { procedure: string | null }[] | null;
  journey_tasks: TaskRow[] | null;
};

function toJourney(j: JourneyRow): PatientJourney {
  const patient = (Array.isArray(j.patients) ? j.patients[0] : j.patients) as JourneyInfo["patient"];
  return {
    id: j.id,
    patient_id: j.patient_id,
    surgery_date: j.surgery_date,
    template_name: j.template_name,
    template_id: j.template_id,
    procedure: (Array.isArray(j.templates) ? j.templates[0] : j.templates)?.procedure ?? null,
    patient_info: j.patient_info ?? null,
    red_flags: j.red_flags ?? null,
    cancelled_at: j.cancelled_at ?? null,
    patient,
    summary: summarize(j.journey_tasks ?? [], j.surgery_date),
  };
}

// Runs the journeys query, dropping the newest optional columns in turn if the database doesn't have them yet.
async function runJourneysQuery(apply: (select: string) => PromiseLike<{ data: unknown; error: unknown }>) {
  let { data, error } = await apply(journeySelect(3));
  if (error) ({ data, error } = await apply(journeySelect(2)));
  if (error) ({ data, error } = await apply(journeySelect(1)));
  if (error) ({ data } = await apply(journeySelect(0)));
  return data;
}

const PAGE = 1000;

// All journeys of the caller's clinic (staff) or the caller's own journey (patient), with readiness.
// Journeys and their tasks come back in a single request, in one page for the common case.
export async function loadJourneys(): Promise<PatientJourney[]> {
  const supabase = await createClient();
  const page = (select: string, from: number, to: number) =>
    supabase.from("journeys").select(select).order("surgery_date").range(from, to);

  let rows: JourneyRow[] = [];
  let select = journeySelect(0);
  for (const tier of [3, 2, 1, 0]) {
    select = journeySelect(tier);
    const { data, error } = await page(select, 0, PAGE - 1);
    if (!error) { rows = (data ?? []) as unknown as JourneyRow[]; break; }
  }

  // A clinic with more than 1000 active journeys would otherwise be silently cut off here —
  // Supabase caps a single request at 1000 rows without erroring, so keep paging while a page
  // comes back full.
  while (rows.length > 0 && rows.length % PAGE === 0) {
    const { data: more } = await page(select, rows.length, rows.length + PAGE - 1);
    if (!more || more.length === 0) break;
    rows = rows.concat(more as unknown as JourneyRow[]);
    if (more.length < PAGE) break;
  }

  return rows.map(toJourney);
}

export async function loadJourney(journeyId: string): Promise<PatientJourney | null> {
  const supabase = await createClient();
  const data = await runJourneysQuery((select) => supabase.from("journeys").select(select).eq("id", journeyId).maybeSingle());
  return data ? toJourney(data as unknown as JourneyRow) : null;
}
