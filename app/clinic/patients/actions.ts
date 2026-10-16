"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOGIN_DOMAIN, requireProfile } from "@/lib/auth";

export async function reviewTask(taskId: string, decision: "accept" | "reject" | "reopen", note?: string) {
  const profile = await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();

  if (decision === "reject" && !note?.trim()) return { error: "יש לכתוב סיבה לדחייה" };

  const patch =
    decision === "accept"
      ? { status: "accepted", review_note: null, reviewed_at: new Date().toISOString(), reviewed_by: profile.id }
      : decision === "reject"
        ? { status: "rejected", review_note: note!.trim(), reviewed_at: new Date().toISOString(), reviewed_by: profile.id }
        : { status: "pending", review_note: null, reviewed_at: null, reviewed_by: null, evidence_path: null, evidence_name: null };

  const { error } = await supabase.from("journey_tasks").update(patch).eq("id", taskId);
  if (error) return { error: "הפעולה נכשלה" };
  revalidatePath("/clinic", "layout");
  return {};
}

export type CreatePatientState = { error?: string } | undefined;

export async function createPatient(_: CreatePatientState, formData: FormData): Promise<CreatePatientState> {
  const profile = await requireProfile(["staff", "doctor"]);
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const template_id = String(formData.get("template_id") ?? "");
  const surgery_date = String(formData.get("surgery_date") ?? "");

  if (!full_name || !template_id || !surgery_date) return { error: "יש למלא שם, תבנית ותאריך ניתוח" };
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return { error: "שם משתמש: 3–30 תווים באנגלית, מספרים או . _ -" };
  if (password.length < 8) return { error: "הסיסמה צריכה להכיל לפחות 8 תווים" };

  const admin = createAdminClient();
  if (!admin) return { error: "חסר SUPABASE_SERVICE_ROLE_KEY בהגדרות השרת, ולכן אי אפשר ליצור התחברות למטופל." };

  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email: `${username}@${LOGIN_DOMAIN}`,
    password,
    email_confirm: true,
  });
  if (userErr || !created.user) {
    return { error: userErr?.message.includes("already") ? "שם המשתמש תפוס" : "יצירת המשתמש נכשלה" };
  }
  const userId = created.user.id;

  const rollback = async () => {
    await admin.auth.admin.deleteUser(userId);
  };

  const { error: profErr } = await admin
    .from("profiles")
    .insert({ id: userId, clinic_id: profile.clinic_id, role: "patient", full_name });
  if (profErr) { await rollback(); return { error: "יצירת הפרופיל נכשלה" }; }

  const { data: patient, error: patErr } = await admin
    .from("patients")
    .insert({ clinic_id: profile.clinic_id, user_id: userId, full_name, phone })
    .select("id")
    .single();
  if (patErr || !patient) { await rollback(); return { error: "יצירת המטופל נכשלה" }; }

  const supabase = await createClient();
  const { data: journeyId, error: jErr } = await supabase.rpc("start_journey", {
    p_patient: patient.id,
    p_template: template_id,
    p_surgery: surgery_date,
  });
  if (jErr || !journeyId) { await admin.from("patients").delete().eq("id", patient.id); await rollback(); return { error: "פתיחת המסלול נכשלה" }; }

  revalidatePath("/clinic", "layout");
  redirect(`/clinic/patients/${journeyId}`);
}
