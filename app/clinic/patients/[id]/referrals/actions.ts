"use server";

import { getT } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

// Closes the loop: the staff marks that the result (an MRI, bloodwork, a specialist's letter) came
// back, with the file attached. Staff-only, not something the patient submits.
export async function markReferralResultReceived(referralId: string, path: string, name: string) {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_referral_result_received", { p_referral_id: referralId, p_path: path, p_name: name });
  if (error) return { error: t("שמירת התוצאה נכשלה. ודאו שהורצה התוספת supabase/patch-referral-results.sql.") };
  revalidatePath("/clinic", "layout");
  return {};
}

export async function unmarkReferralResult(referralId: string) {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("unmark_referral_result", { p_referral_id: referralId });
  if (error) return { error: t("השמירה נכשלה") };
  revalidatePath("/clinic", "layout");
  return {};
}
