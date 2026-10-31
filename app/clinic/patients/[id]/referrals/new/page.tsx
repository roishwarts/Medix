import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReferralForm } from "./referral-form";

export const dynamic = "force-dynamic";

export default async function NewReferralPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const profile = await requireProfile(["doctor"]);
  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("full_name")
    .eq("id", id)
    .eq("clinic_id", profile.clinic_id)
    .maybeSingle();
  if (!patient) notFound();

  return (
    <main className="mx-auto max-w-xl">
      <p className="eyebrow">{patient.full_name}</p>
      <h1 className="display mt-1 text-3xl">{t("הפניה חדשה")}</h1>
      <ReferralForm patientId={id} />
      <Link href={`/clinic/patients/${id}`} className="mt-3 inline-block text-sm text-muted hover:underline">{t("ביטול וחזרה לכרטיס המטופל")}</Link>
    </main>
  );
}
