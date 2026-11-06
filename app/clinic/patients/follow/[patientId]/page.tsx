import { notFound, redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getClinicOptions } from "@/lib/clinic-options";
import { getT } from "@/lib/i18n/server";
import { patientExtras } from "@/lib/patient-extras";
import { STAGE_LABEL, STAGE_PILL } from "@/lib/journey";
import { PatientDetails } from "../../[id]/patient-details";
import { StartJourney } from "../../[id]/start-journey";
import { InvitationPanel } from "../../[id]/invitation-panel";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: (await getT())("מטופל למעקב") };
}

// A patient who is under follow-up: no surgery (or date) yet, so no journey. The details can be edited,
// a join link sent, and the surgery journey started from here once there is a surgery.
export default async function FollowUpPatientPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const [{ data: patient }, { data: journeyRow }, { data: templates }, options, extras] = await Promise.all([
    supabase.from("patients").select("id, full_name, phone, email, user_id, hospital, company, national_id, hmo, insurance_company, insurance_policy_number, insurance_phone").eq("id", patientId).maybeSingle(),
    supabase.from("journeys").select("id").eq("patient_id", patientId).limit(1).maybeSingle(),
    supabase.from("templates").select("id, name").order("name"),
    getClinicOptions(),
    patientExtras(patientId),
  ]);
  if (!patient) notFound();
  // Once a journey exists the normal card takes over.
  if (journeyRow?.id) redirect(`/clinic/patients/${journeyRow.id}`);

  return (
    <main className="max-w-2xl">
      <p className="eyebrow">{t("מטופלים")}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="display text-3xl sm:text-4xl">{patient.full_name}</h1>
        <span className={`pill ${STAGE_PILL.followup}`}>{t(STAGE_LABEL.followup)}</span>
      </div>
      <p className="mt-2 text-muted">{t("מטופל למעקב, ללא ניתוח כרגע. כשיש ניתוח אפשר להתחיל לו מסלול הכנה.")}</p>
      <section aria-label={t("פרטי המטופל")} className="mt-6">
        <PatientDetails
          patientId={patient.id} name={patient.full_name} phone={patient.phone ?? ""} email={patient.email ?? ""}
          hospital={patient.hospital ?? ""} company={patient.company ?? ""}
          nationalId={patient.national_id ?? ""} hmo={patient.hmo ?? ""} insuranceCompany={patient.insurance_company ?? ""}
          insurancePolicyNumber={patient.insurance_policy_number ?? ""} insurancePhone={patient.insurance_phone ?? ""}
          hospitals={options.hospitals} companies={options.companies}
          autoStage="followup" stage={extras?.stage ?? null} lang={extras?.lang ?? "he"}
        />
        <StartJourney patientId={patient.id} templates={templates ?? []} first />
        <InvitationPanel patientId={patient.id} joined={!!patient.user_id} />
      </section>
    </main>
  );
}
