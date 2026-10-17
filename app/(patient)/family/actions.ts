"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import { hashToken } from "@/lib/invite";

export type InviteState = { error?: string; link?: string; relation?: string } | undefined;

const INVITE_DAYS = 7;

export async function createInvite(_: InviteState, formData: FormData): Promise<InviteState> {
  const profile = await requireProfile(["patient"]);
  const relation = String(formData.get("relation") ?? "").trim();
  const canAct = formData.get("can_act") === "on";
  const consent = formData.get("consent") === "on";

  if (!relation || relation.length > 40) return { error: "יש לכתוב קרבה (למשל: בת, בן זוג)" };
  if (!consent) return { error: "יש לאשר שאת/ה מסכימ/ה לשתף את פרטי המסע" };

  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("id, clinic_id").eq("user_id", profile.id).maybeSingle();
  if (!patient) return { error: "לא נמצא מטופל מקושר לחשבון הזה" };

  const { count } = await supabase
    .from("caregiver_invites")
    .select("id", { count: "exact", head: true })
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString());
  if ((count ?? 0) >= 10) return { error: "יש יותר מדי הזמנות פתוחות. אפשר לבטל הזמנה קיימת." };

  const token = randomBytes(32).toString("base64url");
  const { error } = await supabase.from("caregiver_invites").insert({
    clinic_id: patient.clinic_id,
    patient_id: patient.id,
    created_by: profile.id,
    relation,
    can_act: canAct,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + INVITE_DAYS * 86400000).toISOString(),
  });
  if (error) return { error: "יצירת ההזמנה נכשלה" };

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  revalidatePath("/family");
  return { link: `${proto}://${host}/invite/${token}`, relation };
}

export async function revokeInvite(id: string) {
  await requireProfile(["patient"]);
  const supabase = await createClient();
  const { error } = await supabase.from("caregiver_invites").delete().eq("id", id);
  if (error) return { error: "הביטול נכשל" };
  revalidatePath("/family");
  return {};
}

// Used by the patient and by clinic staff. RLS decides which rows the caller can see at all.
export async function removeCaregiver(id: string) {
  await requireProfile(["patient", "staff", "doctor"]);
  const supabase = await createClient();
  const { data: row } = await supabase.from("patient_caregivers").select("user_id").eq("id", id).maybeSingle();
  if (!row) return { error: "לא נמצא" };

  const admin = createAdminClient();
  if (!admin) return { error: "חסר SUPABASE_SERVICE_ROLE_KEY בהגדרות השרת" };
  // The caregiver account exists only for this link; deleting it removes profile and link too.
  const { error } = await admin.auth.admin.deleteUser(row.user_id);
  if (error) return { error: "ההסרה נכשלה" };
  revalidatePath("/family");
  revalidatePath("/clinic", "layout");
  return {};
}

export async function setCaregiverPermission(id: string, canAct: boolean) {
  await requireProfile(["patient"]);
  const supabase = await createClient();
  const { data: row } = await supabase.from("patient_caregivers").select("id").eq("id", id).maybeSingle();
  if (!row) return { error: "לא נמצא" };

  const admin = createAdminClient();
  if (!admin) return { error: "חסר SUPABASE_SERVICE_ROLE_KEY בהגדרות השרת" };
  const { error } = await admin.from("patient_caregivers").update({ can_act: canAct }).eq("id", id);
  if (error) return { error: "העדכון נכשל" };
  revalidatePath("/family");
  return {};
}
