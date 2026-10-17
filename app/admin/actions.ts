"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { LOGIN_DOMAIN } from "@/lib/auth";

export type FormState = { error?: string; ok?: string } | undefined;

const USERNAME = /^[a-z0-9._-]{3,30}$/;
const CLINIC_ROLES = ["doctor", "staff"] as const;

type Db = Awaited<ReturnType<typeof requireAdmin>>["db"];

async function createLogin(db: Db, username: string, password: string) {
  const { data, error } = await db.auth.admin.createUser({
    email: `${username}@${LOGIN_DOMAIN}`,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    return { error: error?.message.includes("already") ? "שם המשתמש תפוס" : "יצירת המשתמש נכשלה" } as const;
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
  const { db } = await requireAdmin();
  const clinicName = String(formData.get("clinic_name") ?? "").trim();
  const physician = String(formData.get("physician") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const templateIds = formData.getAll("templates").map(String);

  if (!clinicName || !physician) return { error: "יש למלא שם מרפאה ושם רופא" };
  if (!USERNAME.test(username)) return { error: "שם משתמש: 3–30 תווים באנגלית, מספרים או . _ -" };
  if (password.length < 8) return { error: "הסיסמה צריכה להכיל לפחות 8 תווים" };

  const { data: clinic, error: cErr } = await db.from("clinics").insert({ name: clinicName }).select("id").single();
  if (cErr || !clinic) return { error: "יצירת המרפאה נכשלה" };

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
  if (pErr) { await rollback(); return { error: "יצירת פרופיל הרופא נכשלה" }; }

  for (const baseId of templateIds) {
    const { error } = await db.rpc("admin_copy_base_template", { p_base: baseId, p_clinic: clinic.id });
    if (error) { await rollback(); return { error: "העתקת התבנית נכשלה" }; }
  }

  revalidatePath("/admin");
  redirect(`/admin/clinics/${clinic.id}`);
}

export async function addClinicUser(clinicId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { db } = await requireAdmin();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName) return { error: "יש להזין שם" };
  if (!(CLINIC_ROLES as readonly string[]).includes(role)) return { error: "תפקיד לא תקין" };
  if (!USERNAME.test(username)) return { error: "שם משתמש: 3–30 תווים באנגלית, מספרים או . _ -" };
  if (password.length < 8) return { error: "הסיסמה צריכה להכיל לפחות 8 תווים" };

  const login = await createLogin(db, username, password);
  if ("error" in login) return { error: login.error };

  const { error } = await db.from("profiles").insert({ id: login.id, clinic_id: clinicId, role, full_name: fullName });
  if (error) {
    await db.auth.admin.deleteUser(login.id);
    return { error: "יצירת הפרופיל נכשלה" };
  }
  revalidatePath(`/admin/clinics/${clinicId}`);
  return { ok: `${fullName} נוסף/ה` };
}

export async function setUserDisabled(userId: string, disabled: boolean): Promise<{ error?: string }> {
  const { db } = await requireAdmin();
  const user = await clinicUser(db, userId);
  if (!user) return { error: "משתמש לא נמצא" };

  // Profile flag cuts database access at once; the ban stops new logins and token refresh.
  const { error } = await db.from("profiles").update({ disabled }).eq("id", userId);
  if (error) return { error: "העדכון נכשל" };
  const { error: banErr } = await db.auth.admin.updateUserById(userId, { ban_duration: disabled ? "876000h" : "none" });
  if (banErr) return { error: "העדכון נכשל" };
  revalidatePath(`/admin/clinics/${user.clinic_id}`);
  return {};
}

export async function resetUserPassword(userId: string, password: string): Promise<{ error?: string; ok?: boolean }> {
  const { db } = await requireAdmin();
  if (password.length < 8) return { error: "הסיסמה צריכה להכיל לפחות 8 תווים" };
  const user = await clinicUser(db, userId);
  if (!user) return { error: "משתמש לא נמצא" };
  const { error } = await db.auth.admin.updateUserById(userId, { password });
  if (error) return { error: "איפוס הסיסמה נכשל" };
  return { ok: true };
}

export async function addTemplateToClinic(clinicId: string, baseId: string): Promise<{ error?: string }> {
  const { db } = await requireAdmin();
  const { error } = await db.rpc("admin_copy_base_template", { p_base: baseId, p_clinic: clinicId });
  if (error) return { error: "ההעתקה נכשלה" };
  revalidatePath(`/admin/clinics/${clinicId}`);
  return {};
}
