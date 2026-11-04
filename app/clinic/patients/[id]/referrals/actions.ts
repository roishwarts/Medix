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
  if (recipient.length > 120) return { error: t("שם הנמען ארוך מדי (עד 120 תווים)") };
  if (!reason) return { error: t("יש להזין סיבת ההפניה") };
  if (reason.length > 200) return { error: t("סיבת ההפניה ארוכה מדי (עד 200 תווים)") };
  if (body.length > 4000) return { error: t("תוכן ההפניה ארוך מדי (עד 4000 תווים)") };

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
  // Defense in depth: the file picker's `accept` attribute (and the client-side check next to it)
  // only hint at image/PDF - either is trivially bypassable. Verify what was actually uploaded.
  const folder = path.split("/").slice(0, -1).join("/");
  const filename = path.split("/").pop() ?? "";
  const { data: listing } = await supabase.storage.from("referral-results").list(folder);
  const mime = listing?.find((f) => f.name === filename)?.metadata?.mimetype as string | undefined;
  if (mime && !/^image\//.test(mime) && mime !== "application/pdf") {
    await supabase.storage.from("referral-results").remove([path]);
    return { error: t("סוג קובץ לא נתמך. יש להעלות תמונה או PDF.") };
  }
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
