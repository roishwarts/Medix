"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOGIN_DOMAIN } from "@/lib/auth";
import { hashToken } from "@/lib/invite";

export type AcceptState = { error?: string } | undefined;

export async function acceptInvite(token: string, _: AcceptState, formData: FormData): Promise<AcceptState> {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!full_name) return { error: "יש להזין שם מלא" };
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return { error: "שם משתמש: 3–30 תווים באנגלית, מספרים או . _ -" };
  if (password.length < 8) return { error: "הסיסמה צריכה להכיל לפחות 8 תווים" };

  const admin = createAdminClient();
  if (!admin) return { error: "ההרשמה אינה זמינה כרגע. פנה/י למרפאה." };

  // Claim the invite atomically so a link works exactly once.
  const { data: invite } = await admin
    .from("caregiver_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id, clinic_id, patient_id, relation, can_act, created_at")
    .maybeSingle();
  if (!invite) return { error: "ההזמנה אינה תקפה או שכבר נוצלה. בקש/י הזמנה חדשה." };

  const release = async (userId?: string) => {
    if (userId) await admin.auth.admin.deleteUser(userId);
    await admin.from("caregiver_invites").update({ used_at: null }).eq("id", invite.id);
  };

  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email: `${username}@${LOGIN_DOMAIN}`,
    password,
    email_confirm: true,
  });
  if (userErr || !created.user) {
    await release();
    return { error: userErr?.message.includes("already") ? "שם המשתמש תפוס" : "יצירת המשתמש נכשלה" };
  }
  const userId = created.user.id;

  const { error: profErr } = await admin
    .from("profiles")
    .insert({ id: userId, clinic_id: invite.clinic_id, role: "caregiver", full_name });
  if (profErr) { await release(userId); return { error: "יצירת הפרופיל נכשלה" }; }

  const { error: linkErr } = await admin.from("patient_caregivers").insert({
    clinic_id: invite.clinic_id,
    patient_id: invite.patient_id,
    user_id: userId,
    full_name,
    relation: invite.relation,
    can_act: invite.can_act,
    consent_at: invite.created_at,
  });
  if (linkErr) { await release(userId); return { error: "הקישור למטופל נכשל" }; }

  const supabase = await createClient();
  const { error: signErr } = await supabase.auth.signInWithPassword({
    email: `${username}@${LOGIN_DOMAIN}`,
    password,
  });
  if (signErr) redirect("/login");
  redirect("/journey");
}
