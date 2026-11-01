import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadJourneys } from "@/lib/queries";

export const dynamic = "force-dynamic";

// A full export of everything the system holds about one patient: every journey's tasks, PROMs
// answers, visit notes, referrals (with fresh links to any attached files) and family access.
// Doctor-only, for a right-to-access request. Does not delete anything — see the README on why
// a delete flow isn't built yet (medical-record retention rules need a lawyer's sign-off first).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile(["doctor"]);
  const supabase = await createClient();

  const allJourneys = await loadJourneys();
  const patientId = allJourneys.find((j) => j.id === id)?.patient_id;
  if (!patientId) return new NextResponse("Not found", { status: 404 });
  const journeys = allJourneys.filter((j) => j.patient_id === patientId);

  const [{ data: patientRow }, { data: caregivers }, { data: visitNotes }, { data: referrals }, { data: promsRows }] = await Promise.all([
    supabase
      .from("patients")
      .select("full_name, phone, email, national_id, hmo, insurance_company, insurance_policy_number, insurance_phone, hospital, company")
      .eq("id", patientId)
      .eq("clinic_id", profile.clinic_id)
      .maybeSingle(),
    supabase.from("patient_caregivers").select("full_name, relation, can_act, created_at").eq("patient_id", patientId),
    supabase.from("visit_notes").select("journey_task_id, note, created_at").eq("patient_id", patientId),
    supabase
      .from("referrals")
      .select("recipient, reason, body, created_at, result_status, result_path, result_name")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
    supabase.from("proms_responses").select("journey_id, instrument, timepoint, answers, score, submitted_at").eq("patient_id", patientId),
  ]);
  if (!patientRow) return new NextResponse("Not found", { status: 404 });

  const notesByTask = new Map((visitNotes ?? []).map((n) => [n.journey_task_id as string, n]));
  const promsByJourney = new Map<string, typeof promsRows>();
  for (const p of promsRows ?? []) {
    const list = promsByJourney.get(p.journey_id) ?? [];
    list.push(p);
    promsByJourney.set(p.journey_id, list);
  }

  // Fresh, generous-expiry links so whoever receives this export can actually open the files —
  // not just see that they exist.
  const sign = (bucket: string, path: string | null) =>
    path ? supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24).then((r) => r.data?.signedUrl ?? null) : Promise.resolve(null);

  const journeysOut = await Promise.all(
    journeys.map(async (j) => ({
      template_name: j.template_name,
      procedure: j.procedure,
      surgery_date: j.surgery_date,
      cancelled_at: j.cancelled_at,
      tasks: await Promise.all(
        j.summary.tasks.map(async (t) => ({
          title: t.title,
          description: t.description,
          owner: t.owner,
          kind: t.kind,
          status: t.status,
          due_date: t.dueDate,
          scheduled_at: t.scheduled_at,
          evidence_name: t.evidence_name,
          evidence_url: await sign("evidence", t.evidence_path),
          patient_note: t.patient_note,
          review_note: t.review_note,
          submitted_at: t.submitted_at,
          reviewed_at: t.reviewed_at,
          visit_note: notesByTask.get(t.id)?.note ?? null,
        })),
      ),
      proms: (promsByJourney.get(j.id) ?? []).map((p) => ({
        instrument: p.instrument, timepoint: p.timepoint, answers: p.answers, score: p.score, submitted_at: p.submitted_at,
      })),
    })),
  );

  const referralsOut = await Promise.all(
    (referrals ?? []).map(async (r) => ({
      recipient: r.recipient, reason: r.reason, body: r.body, created_at: r.created_at,
      result_status: r.result_status, result_name: r.result_name,
      result_url: await sign("referral-results", r.result_path),
    })),
  );

  const body = {
    exported_at: new Date().toISOString(),
    exported_by: profile.full_name,
    clinic: profile.clinic_name,
    patient: patientRow,
    journeys: journeysOut,
    referrals: referralsOut,
    caregivers: caregivers ?? [],
  };

  // The patient's name is Hebrew, which an ASCII-only Content-Disposition filename can't carry
  // directly — RFC 5987's filename* takes percent-encoded UTF-8, with a plain ASCII fallback name.
  const encodedName = encodeURIComponent(`${patientRow.full_name}-export.json`);
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="export.json"; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "no-store",
    },
  });
}
