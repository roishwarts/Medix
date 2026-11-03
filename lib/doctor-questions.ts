import { createClient } from "@/lib/supabase/server";
import type { QuestionItem } from "@/app/clinic/questions/question-card";

type Row = {
  id: string; patient_id: string; journey_id: string | null; question: string; urgent: boolean;
  asked_by: string | null; asked_at: string; answer: string | null; answered_by: string | null; answered_at: string | null;
};

// Questions sent to the doctor. Returns an empty list before patch-doctor-queue.sql has been applied,
// so the screens that show them keep working.
export async function loadQuestions(opts: { patientId?: string; answeredSince?: string; limit?: number } = {}): Promise<QuestionItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from("doctor_questions")
    .select("id, patient_id, journey_id, question, urgent, asked_by, asked_at, answer, answered_by, answered_at")
    .order("asked_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.patientId) q = q.eq("patient_id", opts.patientId);
  // Open questions always; answered ones only inside the window, so the page stays short.
  if (opts.answeredSince) q = q.or(`answered_at.is.null,answered_at.gte.${opts.answeredSince}`);
  const { data, error } = await q;
  if (error || !data) return [];
  const rows = data as Row[];
  if (rows.length === 0) return [];

  const [{ data: people }, { data: patients }, { data: journeys }] = await Promise.all([
    supabase.from("profiles").select("id, full_name"),
    supabase.from("patients").select("id, full_name").in("id", [...new Set(rows.map((r) => r.patient_id))]),
    supabase.from("journeys").select("id, patient_id").in("patient_id", [...new Set(rows.map((r) => r.patient_id))]),
  ]);
  const person = new Map((people ?? []).map((p) => [p.id as string, p.full_name as string]));
  const patient = new Map((patients ?? []).map((p) => [p.id as string, p.full_name as string]));
  // A patient with several journeys: link to the newest one that exists when the question names none.
  const journeyOf = new Map<string, string>();
  for (const j of journeys ?? []) journeyOf.set(j.patient_id as string, j.id as string);

  return rows.map((r) => ({
    id: r.id,
    patientId: r.patient_id,
    journeyId: r.journey_id ?? journeyOf.get(r.patient_id) ?? null,
    patientName: patient.get(r.patient_id) ?? "",
    question: r.question,
    urgent: r.urgent,
    askedById: r.asked_by,
    askedByName: (r.asked_by && person.get(r.asked_by)) || "",
    askedAt: r.asked_at,
    answer: r.answer,
    answeredByName: (r.answered_by && person.get(r.answered_by)) || null,
    answeredAt: r.answered_at,
  }));
}

export async function countOpenQuestions(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("doctor_questions").select("id", { count: "exact", head: true }).is("answered_at", null);
  return error ? 0 : (count ?? 0);
}
