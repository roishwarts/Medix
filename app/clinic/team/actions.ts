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

export type TeamMember = { id: string; full_name: string; full_name_en: string | null; role: "staff" | "doctor"; username: string; disabled: boolean; mfa: boolean };

export async function loadTeam(): Promise<TeamMember[]> {
  const profile = await requireProfile(["doctor"]);
  const admin = createAdminClient();
  const supabase = await createClient();
  // full_name_en (patch-name-translations.sql) may not exist yet: fall back to a select without it.
  type Row = { id: string; full_name: string; full_name_en: string | null; role: "staff" | "doctor"; disabled: boolean };
  let data: Row[] | null;
  const withEn = await supabase
    .from("profiles")
    .select("id, full_name, full_name_en, role, disabled")
    .eq("clinic_id", profile.clinic_id)
    .in("role", ["staff", "doctor"])
    .order("role")
    .order("full_name");
  if (!withEn.error) {
    data = withEn.data as Row[] | null;
  } else {
    const withoutEn = await supabase
      .from("profiles")
      .select("id, full_name, role, disabled")
      .eq("clinic_id", profile.clinic_id)
      .in("role", ["staff", "doctor"])
      .order("role")
      .order("full_name");
    data = (withoutEn.data ?? []).map((p) => ({ ...p, full_name_en: null })) as Row[];
  }
  if (!data || !admin) return (data ?? []).map((p) => ({ ...p, username: "", mfa: false }));

  return Promise.all(
    data.map(async (p) => {
      const [{ data: u }, { data: f }] = await Promise.all([
        admin.auth.admin.getUserById(p.id),
        admin.auth.admin.mfa.listFactors({ userId: p.id }),
      ]);
      return { ...p, username: u.user?.email?.split("@")[0] ?? "", mfa: (f?.factors ?? []).some((x) => x.status === "verified") };
    }),
  );
}

// Every mutating action below is doctor-only and re-checks the target belongs to the caller's own
// clinic, so a doctor can only manage their own clinic's team even though these use the admin
// client (required for auth.admin.* calls) which would otherwise see every clinic.
async function teamMember(clinicId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, clinic_id, role").eq("id", userId).eq("clinic_id", clinicId).in("role", ["staff", "doctor"]).maybeSingle();
  return data;
}

// A clinic with no doctor left could never manage its own team again (this whole page, and
// addTeamMember, are doctor-only) — so the last doctor can't be disabled, demoted, or have their
// own role changed by someone else racing them.
async function isLastDoctor(clinicId: string, excludingUserId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId).eq("role", "doctor").eq("disabled", false).neq("id", excludingUserId);
  return (count ?? 0) === 0;
}

export async function setTeamMemberDisabled(userId: string, disabled: boolean): Promise<{ error?: string }> {
  const t = await getT();
  const profile = await requireProfile(["doctor"]);
  if (userId === profile.id) return { error: t("לא ניתן להשבית את המשתמש שלך עצמך") };
  const member = await teamMember(profile.clinic_id, userId);
  if (!member) return { error: t("משתמש לא נמצא") };
  if (disabled && member.role === "doctor" && (await isLastDoctor(profile.clinic_id, userId))) {
    return { error: t("לא ניתן להשבית את הרופא היחיד במרפאה") };
  }

  const admin = createAdminClient();
  if (!admin) return { error: t("חסר SUPABASE_SERVICE_ROLE_KEY בהגדרות השרת") };
  const { error } = await admin.from("profiles").update({ disabled }).eq("id", userId);
  if (error) return { error: t("העדכון נכשל") };
  const { error: banErr } = await admin.auth.admin.updateUserById(userId, { ban_duration: disabled ? "876000h" : "none" });
  if (banErr) return { error: t("העדכון נכשל") };
  revalidatePath("/clinic/team");
  return {};
}

export async function setTeamMemberRole(userId: string, role: "staff" | "doctor"): Promise<{ error?: string }> {
  const t = await getT();
  const profile = await requireProfile(["doctor"]);
  if (userId === profile.id) return { error: t("לא ניתן לשנות את התפקיד של המשתמש שלך עצמך") };
  if (!(ROLES as readonly string[]).includes(role)) return { error: t("תפקיד לא תקין") };
  const member = await teamMember(profile.clinic_id, userId);
  if (!member) return { error: t("משתמש לא נמצא") };
  if (member.role === "doctor" && role !== "doctor" && (await isLastDoctor(profile.clinic_id, userId))) {
    return { error: t("לא ניתן להשאיר מרפאה בלי אף רופא") };
  }

  const admin = createAdminClient();
  if (!admin) return { error: t("חסר SUPABASE_SERVICE_ROLE_KEY בהגדרות השרת") };
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: t("העדכון נכשל") };
  revalidatePath("/clinic/team");
  return {};
}

export async function resetTeamMemberPassword(userId: string, password: string): Promise<{ error?: string; ok?: boolean }> {
  const t = await getT();
  const profile = await requireProfile(["doctor"]);
  if (password.length < 8) return { error: t("הסיסמה צריכה להכיל לפחות 8 תווים") };
  const member = await teamMember(profile.clinic_id, userId);
  if (!member) return { error: t("משתמש לא נמצא") };

  const admin = createAdminClient();
  if (!admin) return { error: t("חסר SUPABASE_SERVICE_ROLE_KEY בהגדרות השרת") };
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: t("איפוס הסיסמה נכשל") };
  return { ok: true };
}

export async function resetTeamMemberMfa(userId: string): Promise<{ error?: string }> {
  const t = await getT();
  const profile = await requireProfile(["doctor"]);
  const member = await teamMember(profile.clinic_id, userId);
  if (!member) return { error: t("משתמש לא נמצא") };

  const admin = createAdminClient();
  if (!admin) return { error: t("חסר SUPABASE_SERVICE_ROLE_KEY בהגדרות השרת") };
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId });
  if (error) return { error: t("האיפוס נכשל") };
  for (const f of data?.factors ?? []) {
    const { error: delErr } = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId });
    if (delErr) return { error: t("האיפוס נכשל") };
  }
  revalidatePath("/clinic/team");
  return {};
}

// Anyone with a profile may set their own English name (not gated to doctor, unlike the rest of
// this file) - this is what shows instead of the Hebrew one when the app isn't in Hebrew.
export async function saveMyFullNameEn(name: string): Promise<{ error?: string }> {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_my_full_name_en", { p_name: name });
  if (error) return { error: t("השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-name-translations.sql.") };
  revalidatePath("/clinic/team");
  revalidatePath("/clinic", "layout");
  return {};
}
