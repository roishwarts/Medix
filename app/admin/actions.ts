"use server";

import { getT } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { LOGIN_DOMAIN } from "@/lib/auth";

export type FormState = { error?: string; ok?: string } | undefined;

const USERNAME = /^[a-z0-9._-]{3,30}$/;
const CLINIC_ROLES = ["doctor", "staff"] as const;

type Db = Awaited<ReturnType<typeof requireAdmin>>["db"];

async function createLogin(db: Db, username: string, password: string) {
  const t = await getT();
  const { data, error } = await db.auth.admin.createUser({
    email: `${username}@${LOGIN_DOMAIN}`,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    return { error: error?.message.includes("already") ? t("שם המשתמש תפוס") : t("יצירת המשתמש נכשלה") } as const;
  }
  return { id: data.user.id } as const;
}

// Only doctors and staff are managed here; the admin never touches patient or caregiver accounts.
async function clinicUser(db: Db, userId: string) {
  const { data } = await db
    .from("profiles")
    .select("id, clinic_id, role")
    .eq("id", userId)
    .in("role", [...CLINIC_ROLES])
    .maybeSingle();
  return data;
}

export async function createClinic(_: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const { db } = await requireAdmin();
  const clinicName = String(formData.get("clinic_name") ?? "").trim();
  const physician = String(formData.get("physician") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const templateIds = formData.getAll("templates").map(String);

  if (!clinicName || !physician) return { error: t("יש למלא שם מרפאה ושם רופא") };
  if (!USERNAME.test(username)) return { error: t("שם משתמש: 3–30 תווים באנגלית, מספרים או . _ -") };
  if (password.length < 8) return { error: t("הסיסמה צריכה להכיל לפחות 8 תווים") };

  const { data: clinic, error: cErr } = await db.from("clinics").insert({ name: clinicName }).select("id").single();
  if (cErr || !clinic) return { error: t("יצירת המרפאה נכשלה") };

  let userId: string | undefined;
  const rollback = async () => {
    await db.from("templates").delete().eq("clinic_id", clinic.id);
    if (userId) await db.auth.admin.deleteUser(userId); // removes the profile too
    await db.from("clinics").delete().eq("id", clinic.id);
  };

  const login = await createLogin(db, username, password);
  if ("error" in login) { await rollback(); return { error: login.error }; }
  userId = login.id;

  const { error: pErr } = await db.from("profiles").insert({ id: userId, clinic_id: clinic.id, role: "doctor", full_name: physician });
  if (pErr) { await rollback(); return { error: t("יצירת פרופיל הרופא נכשלה") }; }

  for (const baseId of templateIds) {
    const { error } = await db.rpc("admin_copy_base_template", { p_base: baseId, p_clinic: clinic.id });
    if (error) { await rollback(); return { error: t("העתקת התבנית נכשלה") }; }
  }

  revalidatePath("/admin");
  redirect(`/admin/clinics/${clinic.id}`);
}

export async function addClinicUser(clinicId: string, _: FormState, formData: FormData): Promise<FormState> {
  const t = await getT();
  const { db } = await requireAdmin();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName) return { error: t("יש להזין שם") };
  if (!(CLINIC_ROLES as readonly string[]).includes(role)) return { error: t("תפקיד לא תקין") };
  if (!USERNAME.test(username)) return { error: t("שם משתמש: 3–30 תווים באנגלית, מספרים או . _ -") };
  if (password.length < 8) return { error: t("הסיסמה צריכה להכיל לפחות 8 תווים") };

  const login = await createLogin(db, username, password);
  if ("error" in login) return { error: login.error };

  const { error } = await db.from("profiles").insert({ id: login.id, clinic_id: clinicId, role, full_name: fullName });
  if (error) {
    await db.auth.admin.deleteUser(login.id);
    return { error: t("יצירת הפרופיל נכשלה") };
  }
  revalidatePath(`/admin/clinics/${clinicId}`);
  return { ok: (await getT())("{name} נוסף/ה", { name: fullName }) };
}

export async function setUserDisabled(userId: string, disabled: boolean): Promise<{ error?: string }> {
  const t = await getT();
  const { db } = await requireAdmin();
  const user = await clinicUser(db, userId);
  if (!user) return { error: t("משתמש לא נמצא") };

  // Profile flag cuts database access at once; the ban stops new logins and token refresh.
  const { error } = await db.from("profiles").update({ disabled }).eq("id", userId);
  if (error) return { error: t("העדכון נכשל") };
  const { error: banErr } = await db.auth.admin.updateUserById(userId, { ban_duration: disabled ? "876000h" : "none" });
  if (banErr) return { error: t("העדכון נכשל") };
  revalidatePath(`/admin/clinics/${user.clinic_id}`);
  return {};
}

export async function resetUserPassword(userId: string, password: string): Promise<{ error?: string; ok?: boolean }> {
  const t = await getT();
  const { db } = await requireAdmin();
  if (password.length < 8) return { error: t("הסיסמה צריכה להכיל לפחות 8 תווים") };
  const user = await clinicUser(db, userId);
  if (!user) return { error: t("משתמש לא נמצא") };
  const { error } = await db.auth.admin.updateUserById(userId, { password });
  if (error) return { error: t("איפוס הסיסמה נכשל") };
  return { ok: true };
}

export async function setClinicMfa(clinicId: string, required: boolean): Promise<{ error?: string }> {
  const t = await getT();
  const { db } = await requireAdmin();
  const { error } = await db.from("clinics").update({ mfa_required: required }).eq("id", clinicId);
  if (error) return { error: t("העדכון נכשל. ודאו שהורצה התוספת supabase/patch-mfa.sql.") };
  revalidatePath(`/admin/clinics/${clinicId}`);
  return {};
}

// For a lost phone: removes the user's authenticator, so they set up a new one at the next login.
export async function resetUserMfa(userId: string): Promise<{ error?: string }> {
  const t = await getT();
  const { db } = await requireAdmin();
  const user = await clinicUser(db, userId);
  if (!user) return { error: t("משתמש לא נמצא") };
  const { data, error } = await db.auth.admin.mfa.listFactors({ userId });
  if (error) return { error: t("האיפוס נכשל") };
  for (const f of data?.factors ?? []) {
    const { error: delErr } = await db.auth.admin.mfa.deleteFactor({ id: f.id, userId });
    if (delErr) return { error: t("האיפוס נכשל") };
  }
  revalidatePath(`/admin/clinics/${user.clinic_id}`);
  return {};
}

export async function setClinicAddress(clinicId: string, address: string): Promise<{ error?: string }> {
  const t = await getT();
  const { db } = await requireAdmin();
  const a = address.trim().replace(/\s+/g, " ");
  if (a.length > 200) return { error: t("הכתובת ארוכה מדי") };
  const { error } = await db.from("clinics").update({ address: a || null }).eq("id", clinicId);
  if (error) return { error: t("השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-location.sql.") };
  revalidatePath(`/admin/clinics/${clinicId}`);
  return {};
}

export async function addClinicOption(clinicId: string, kind: "hospital" | "company", name: string): Promise<{ error?: string }> {
  const t = await getT();
  const { db } = await requireAdmin();
  const n = name.trim().replace(/\s+/g, " ");
  if (!n) return { error: t("יש להזין שם") };
  if (n.length > 80) return { error: t("השם ארוך מדי") };
  if (kind !== "hospital" && kind !== "company") return { error: t("סוג לא תקין") };
  const { error } = await db.from("clinic_options").insert({ clinic_id: clinicId, kind, name: n });
  if (error) return { error: error.code === "23505" || /duplicate|unique/i.test(error.message) ? t("כבר קיים ברשימה") : t("ההוספה נכשלה. ודאו שהורצה התוספת supabase/patch-options.sql.") };
  revalidatePath(`/admin/clinics/${clinicId}`);
  return {};
}

export async function removeClinicOption(id: string): Promise<{ error?: string }> {
  const { db } = await requireAdmin();
  const { data } = await db.from("clinic_options").delete().eq("id", id).select("clinic_id").maybeSingle();
  if (data) revalidatePath(`/admin/clinics/${data.clinic_id}`);
  return {};
}

export async function addTemplateToClinic(clinicId: string, baseId: string): Promise<{ error?: string }> {
  const t = await getT();
  const { db } = await requireAdmin();
  const { error } = await db.rpc("admin_copy_base_template", { p_base: baseId, p_clinic: clinicId });
  if (error) return { error: t("ההעתקה נכשלה") };
  revalidatePath(`/admin/clinics/${clinicId}`);
  return {};
}
