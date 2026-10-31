"use server";

import { getT } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import { requireProfile, LOGIN_DOMAIN } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: string } | undefined;

const USERNAME = /^[a-z0-9._-]{3,30}$/;
const ROLES = ["staff", "doctor"] as const;

// Doctor-only, scoped to their own clinic — mirrors app/admin/actions.ts's addClinicUser, which
// does the same thing across any clinic for the platform admin. Kept as its own small action
// rather than sharing code across the admin/clinic boundary, matching the rest of this codebase's
// per-area action files.
export async function addTeamMember(_: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const profile = await requireProfile(["doctor"]);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName) return { error: t("יש להזין שם") };
  if (!(ROLES as readonly string[]).includes(role)) return { error: t("תפקיד לא תקין") };
  if (!USERNAME.test(username)) return { error: t("שם משתמש: 3–30 תווים באנגלית, מספרים או . _ -") };
  if (password.length < 8) return { error: t("הסיסמה צריכה להכיל לפחות 8 תווים") };

  const admin = createAdminClient();
  if (!admin) return { error: t("חסר SUPABASE_SERVICE_ROLE_KEY בהגדרות השרת") };

  const { data, error: createErr } = await admin.auth.admin.createUser({
    email: `${username}@${LOGIN_DOMAIN}`,
    password,
    email_confirm: true,
  });
  if (createErr || !data.user) {
    return { error: createErr?.message.includes("already") ? t("שם המשתמש תפוס") : t("יצירת המשתמש נכשלה") };
  }

  const { error: profileErr } = await admin
    .from("profiles")
    .insert({ id: data.user.id, clinic_id: profile.clinic_id, role, full_name: fullName });
  if (profileErr) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: t("יצירת הפרופיל נכשלה") };
  }

  revalidatePath("/clinic/team");
  return { ok: t("המשתמש {username} נוצר בהצלחה", { username }) };
}

export type TeamMember = { id: string; full_name: string; role: "staff" | "doctor" };

export async function loadTeam(): Promise<TeamMember[]> {
  const profile = await requireProfile(["doctor"]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("clinic_id", profile.clinic_id)
    .in("role", ["staff", "doctor"])
    .order("role")
    .order("full_name");
  return (data ?? []) as TeamMember[];
}
