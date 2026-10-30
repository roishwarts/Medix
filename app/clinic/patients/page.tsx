import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { blockerLabel, stageOf, STAGES, type Stage } from "@/lib/journey";
import { loadPatientExtras } from "@/lib/patient-extras";
import { getClinicOptions } from "@/lib/clinic-options";
import { parseDays } from "@/components/patient-filters";
import { PatientsList, type PatientRow } from "@/components/patients-list";
import { loadJourneys } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Search = { q?: string; days?: string; hospital?: string; stage?: string };

export default async function PatientsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const t = await getT();
  const sp = await searchParams;
  const supabase = await createClient();
  const [all, { data: placements }, options, extras] = await Promise.all([
    loadJourneys(),
    // Separate query so the list still works before the hospital/company patch is applied.
    supabase.from("patients").select("id, hospital, company"),
    getClinicOptions(),
    loadPatientExtras(),
  ]);
  const placeOf = new Map((placements ?? []).map((p) => [p.id as string, p as { hospital: string | null; company: string | null }]));
  const hospitals = [...new Set([...options.hospitals, ...(placements ?? []).map((p) => p.hospital as string | null).filter((h): h is string => !!h)])].sort((a, b) => a.localeCompare(b, "he"));
  const stage = sp.stage === "all" || STAGES.includes(sp.stage as Stage) ? (sp.stage as Stage | "all") : "active";
  const rows: PatientRow[] = all.map((j) => ({
    id: j.id, name: j.patient.full_name, surgeryDate: j.surgery_date, daysToSurgery: j.summary.daysToSurgery,
    readiness: j.summary.readiness, readinessState: j.summary.readinessState,
    stage: extras.get(j.patient_id)?.stage ?? stageOf(j.summary),
    hospital: placeOf.get(j.patient_id)?.hospital ?? null, company: placeOf.get(j.patient_id)?.company ?? null,
    step: j.summary.topBlocker ? blockerLabel(j.summary.topBlocker, t) : t("ההכנות הושלמו"),
  }));

  return (
    <main>
      <PatientsList
        title={t("מטופלים")} action={<Link href="/clinic/patients/new" className="btn btn-primary">{t("מטופל חדש")}</Link>}
        rows={rows} hospitals={hospitals} initial={{ q: sp.q ?? "", hospital: sp.hospital ?? "", days: parseDays(sp.days), stage }}
      />
    </main>
  );
}
