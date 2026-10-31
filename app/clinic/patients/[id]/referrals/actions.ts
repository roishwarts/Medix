"use server";

import { getT } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ReferralFormState = { error?: string } | undefined;

export async function createReferral(_: ReferralFormState, formData: FormData): Promise<ReferralFormState> {
  const t = await getT();
  await requireProfile(["doctor"]);
  const patientId = String(formData.get("patient_id") ?? "");
  const recipient = String(formData.get("recipient") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!recipient) return { error: t("יש להזין נמען") };
  if (!reason) return { error: t("יש להזין סיבת ההפניה") };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_referral", {
    p_patient: patientId, p_recipient: recipient, p_reason: reason, p_body: body || null,
  });
  if (error || !data) return { error: t("שמירת ההפניה נכשלה") };

  redirect(`/clinic/patients/${patientId}/referrals/${data}/print`);
}
