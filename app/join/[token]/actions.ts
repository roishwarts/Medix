"use server";

import { getT } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LOGIN_DOMAIN } from "@/lib/auth";
import { hashToken } from "@/lib/invite";

export type JoinState = { error?: string; field?: "username" | "password" } | undefined;

export async function joinAsPatient(token: string, _: JoinState, formData: FormData): Promise<JoinState> {
  const t = await getT();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return { error: t("שם משתמש: 3–30 תווים באנגלית, מספרים או . _ -"), field: "username" };
  if (password.length < 8) return { error: t("הסיסמה צריכה להכיל לפחות 8 תווים"), field: "password" };

  const admin = createAdminClient();
  if (!admin) return { error: t("ההרשמה אינה זמינה כרגע. פנה/י למרפאה.") };

  // Claim the link so it works exactly once.
  const { data: link } = await admin
    .from("account_links")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token))
    .eq("purpose", "patient_join")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id, clinic_id, patient_id")
    .maybeSingle();
  if (!link) return { error: t("הקישור אינו תקף או שכבר נוצל. בקש/י מהמרפאה קישור חדש.") };

  const release = async (userId?: string) => {
    if (userId) await admin.auth.admin.deleteUser(userId);
    await admin.from("account_links").update({ used_at: null }).eq("id", link.id);
  };

  const { data: patient } = await admin.from("patients").select("id, full_name, user_id").eq("id", link.patient_id).maybeSingle();
  if (!patient || patient.user_id) { await release(); return { error: t("המטופל כבר הצטרף. אפשר להיכנס עם שם המשתמש.") }; }

  const email = `${username}@${LOGIN_DOMAIN}`;
  const { data: created, error: userErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (userErr || !created.user) {
    await release();
    return { error: userErr?.message.includes("already") ? t("שם המשתמש תפוס, נסה/י אחר") : t("יצירת המשתמש נכשלה"), field: userErr?.message.includes("already") ? "username" : undefined };
  }
  const userId = created.user.id;

  const { error: profErr } = await admin
    .from("profiles")
    .insert({ id: userId, clinic_id: link.clinic_id, role: "patient", full_name: patient.full_name });
  if (profErr) { await release(userId); return { error: t("יצירת הפרופיל נכשלה") }; }

  const { data: linked } = await admin
    .from("patients")
    .update({ user_id: userId })
    .eq("id", patient.id)
    .is("user_id", null)
    .select("id")
    .maybeSingle();
  if (!linked) { await release(userId); return { error: t("הקישור למטופל נכשל") }; }

  const supabase = await createClient();
  const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signErr) redirect("/login");
  redirect("/journey");
}
