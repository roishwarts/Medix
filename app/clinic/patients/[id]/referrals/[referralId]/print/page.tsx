import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/prefs-server";
import { formatDateLong, israelParts } from "@/lib/dates";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function ReferralPrintPage({ params }: { params: Promise<{ id: string; referralId: string }> }) {
  const { id, referralId } = await params;
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const profile = await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const [{ data: referral }, { data: patient }] = await Promise.all([
    supabase
      .from("referrals")
      .select("id, recipient, reason, body, doctor_name, created_at")
      .eq("id", referralId)
      .eq("patient_id", id)
      .maybeSingle(),
    supabase.from("patients").select("full_name, phone").eq("id", id).eq("clinic_id", profile.clinic_id).maybeSingle(),
  ]);
  if (!referral || !patient) notFound();

  return (
    <main className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/clinic/patients/${id}`} className="text-sm text-muted hover:underline">{t("חזרה לכרטיס המטופל")}</Link>
        <PrintButton />
      </div>

      <div className="card space-y-6 p-8 print:border-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            {profile.logo_url && <img src={profile.logo_url} alt={profile.clinic_name} className="h-12 w-auto max-w-[14rem] object-contain" />}
            <div className="min-w-0">
              {!profile.logo_url && <p className="text-lg font-semibold">{profile.clinic_name}</p>}
              {profile.clinic_address && <p className="text-sm text-muted">{profile.clinic_address}</p>}
              {profile.contact_phone && <p className="text-sm text-muted" dir="ltr">{profile.contact_phone}</p>}
            </div>
          </div>
          <p className="shrink-0 text-sm text-muted">{formatDateLong(israelParts(referral.created_at).date, lang)}</p>
        </header>

        <div>
          <p className="text-sm text-muted">{t("לכבוד")}</p>
          <p className="font-medium">{referral.recipient}</p>
        </div>

        <div>
          <p className="text-sm text-muted">{t("הנדון: הפניה עבור {name}", { name: patient.full_name })}</p>
          <p className="mt-1 font-medium">{referral.reason}</p>
        </div>

        {referral.body && <p className="whitespace-pre-wrap leading-relaxed">{referral.body}</p>}

        <div className="pt-8">
          <p>{t("בכבוד רב,")}</p>
          <p className="mt-1 font-medium">{referral.doctor_name}</p>
          <p className="text-sm text-muted">{profile.clinic_name}</p>
          <div className="mt-10 h-16 w-48 border-b border-line" aria-hidden="true" />
          <p className="text-xs text-muted">{t("חותמת וחתימה")}</p>
        </div>
      </div>
    </main>
  );
}
