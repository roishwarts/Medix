"use server";

import { getT } from "@/lib/i18n/server";
import { randomBytes } from "node:crypto";
import { getClinicOptions } from "@/lib/clinic-options";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClinicName, requireProfile } from "@/lib/auth";
import { israelLocalToIso } from "@/lib/dates";
import { createAccountLink, getOrigin } from "@/lib/account-links";
import { patientLang } from "@/lib/patient-extras";
import { STAGES, type Stage } from "@/lib/journey";
import type { Lang } from "@/lib/prefs";
import { hashToken } from "@/lib/invite";
import { caregiverMessage, joinMessage, resetMessage } from "@/lib/messages";

export async function reviewTask(taskId: string, decision: "accept" | "reject" | "reopen", note?: string) {
  const t = await getT();
  const profile = await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();

  if (decision === "reject" && !note?.trim()) return { error: t("יש לכתוב סיבה לדחייה") };

  const patch =
    decision === "accept"
      ? { status: "accepted", review_note: null, reviewed_at: new Date().toISOString(), reviewed_by: profile.id }
      : decision === "reject"
        ? { status: "rejected", review_note: note!.trim(), reviewed_at: new Date().toISOString(), reviewed_by: profile.id }
        : { status: "pending", review_note: null, reviewed_at: null, reviewed_by: null, evidence_path: null, evidence_name: null };

  const { error } = await supabase.from("journey_tasks").update(patch).eq("id", taskId);
  if (error) return { error: t("הפעולה נכשלה") };
  revalidatePath("/clinic", "layout");
  return {};
}

export type CreatePatientState =
  | {
      error?: string;
      created?: { journeyId: string; patientName: string; phone: string; email: string | null; link?: string; message?: string; linkError?: string };
    }
  | undefined;

const PHONE_OK = /^[0-9+\-\s()]{8,30}$/;
const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The patient exists right away; they create their own login from a link the clinic sends.
export async function createPatient(_: CreatePatientState, formData: FormData): Promise<CreatePatientState> {
  const t = await getT();
  const profile = await requireProfile(["staff", "doctor"]);
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const template_id = String(formData.get("template_id") ?? "");
  const surgery_date = String(formData.get("surgery_date") ?? "");

  if (!full_name || !template_id || !surgery_date) return { error: t("יש למלא שם, תבנית ותאריך ניתוח") };
  if (!PHONE_OK.test(phone)) return { error: t("יש להזין מספר טלפון תקין (לשליחה בוואטסאפ)") };
  if (email && !EMAIL_OK.test(email)) return { error: t("כתובת המייל לא תקינה") };

  const hospital = String(formData.get("hospital") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  // Validate before creating anything, so a stale option (removed from the list after the page loaded)
  // is reported instead of being silently dropped.
  if (hospital || company) {
    const options = await getClinicOptions();
    if (hospital && !options.hospitals.includes(hospital)) return { error: t("בית החולים שנבחר לא ברשימה") };
    if (company && !options.companies.includes(company)) return { error: t("החברה שנבחרה לא ברשימה") };
  }

  const supabase = await createClient();
  const { data: patient, error: patErr } = await supabase
    .from("patients")
    .insert({ clinic_id: profile.clinic_id, full_name, phone, email: email || null })
    .select("id")
    .single();
  if (patErr || !patient) return { error: t("יצירת המטופל נכשלה") };

  const lang: Lang = (["he", "en", "ru", "ar"] as const).find((l) => l === formData.get("lang")) ?? "he";
  // Separate update, so creating a patient still works before supabase/patch-lang-stage.sql has been run.
  if (lang !== "he") await supabase.from("patients").update({ lang }).eq("id", patient.id);

  if (hospital || company) {
    await supabase.from("patients").update({ hospital: hospital || null, company: company || null }).eq("id", patient.id);
  }

  const { data: journeyId, error: jErr } = await supabase.rpc("start_journey", {
    p_patient: patient.id,
    p_template: template_id,
    p_surgery: surgery_date,
  });
  if (jErr || !journeyId) {
    await supabase.from("patients").delete().eq("id", patient.id);
    return { error: t("פתיחת המסלול נכשלה") };
  }
  revalidatePath("/clinic", "layout");

  const link = await createAccountLink({
    purpose: "patient_join",
    clinicId: profile.clinic_id,
    patientId: patient.id,
    createdBy: profile.id,
  });
  const created = { journeyId: journeyId as string, patientName: full_name, phone, email: email || null };
  if ("error" in link) return { created: { ...created, linkError: link.error } };
  return { created: { ...created, link: link.url, message: joinMessage(full_name, await getClinicName(), link.url, lang) } };
}

export type LinkResult = { error?: string; link?: string; message?: string; phone?: string | null; email?: string | null };

// A new join link for a patient who has not created a login yet (resend / lost link).
export async function createJoinLink(patientId: string): Promise<LinkResult> {
  const t = await getT();
  const profile = await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, phone, email, user_id")
    .eq("id", patientId)
    .maybeSingle();
  if (!patient) return { error: t("המטופל לא נמצא") };
  if (patient.user_id) return { error: t("המטופל כבר הצטרף") };

  const link = await createAccountLink({ purpose: "patient_join", clinicId: profile.clinic_id, patientId, createdBy: profile.id });
  if ("error" in link) return { error: link.error };
  revalidatePath("/clinic", "layout");
  return { link: link.url, message: joinMessage(patient.full_name, await getClinicName(), link.url, await patientLang(patientId)), phone: patient.phone, email: patient.email };
}

// A password-reset link for a patient who already has a login (asked for by phone or from the patient page).
export async function createPatientResetLink(patientId: string): Promise<LinkResult> {
  const t = await getT();
  const profile = await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, phone, email, user_id")
    .eq("id", patientId)
    .maybeSingle();
  if (!patient?.user_id) return { error: t("למטופל אין עדיין משתמש") };

  const link = await createAccountLink({ purpose: "password_reset", clinicId: profile.clinic_id, userId: patient.user_id, createdBy: profile.id });
  if ("error" in link) return { error: link.error };
  return { link: link.url, message: resetMessage(patient.full_name, link.url, await patientLang(patientId)), phone: patient.phone, email: patient.email };
}

// From the "forgot password" requests list on the main page.
export async function createResetLinkFromRequest(requestId: string): Promise<LinkResult> {
  const t = await getT();
  const profile = await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { data: req } = await supabase
    .from("password_reset_requests")
    .select("id, user_id, full_name, handled_at")
    .eq("id", requestId)
    .maybeSingle();
  if (!req || req.handled_at) return { error: t("הבקשה כבר טופלה") };

  const link = await createAccountLink({ purpose: "password_reset", clinicId: profile.clinic_id, userId: req.user_id, createdBy: profile.id });
  if ("error" in link) return { error: link.error };

  const { data: patient } = await supabase.from("patients").select("phone, email, lang").eq("user_id", req.user_id).maybeSingle();
  const patientLanguage: Lang = (["he", "en", "ru", "ar"] as const).find((l) => l === patient?.lang) ?? "he";
  const admin = createAdminClient();
  await admin?.from("password_reset_requests").update({ handled_at: new Date().toISOString(), handled_by: profile.id }).eq("id", requestId);
  revalidatePath("/clinic", "layout");
  return { link: link.url, message: resetMessage(req.full_name, link.url, patientLanguage), phone: patient?.phone ?? null, email: patient?.email ?? null };
}

export type CaregiverInviteState = { error?: string; link?: string; message?: string; phone?: string | null; email?: string | null; name?: string } | undefined;

// The clinic adds a family member for a patient. The clinic confirms the patient agreed.
export async function createCaregiverInviteByStaff(patientId: string, _: CaregiverInviteState, formData: FormData): Promise<CaregiverInviteState> {
  const t = await getT();
  const profile = await requireProfile(["staff", "doctor"]);
  const name = String(formData.get("invitee_name") ?? "").trim();
  const relation = String(formData.get("relation") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const canAct = formData.get("can_act") === "on";
  const consent = formData.get("consent") === "on";

  if (!name || name.length > 60) return { error: t("יש להזין את שם בן המשפחה") };
  if (!relation || relation.length > 40) return { error: t("יש להזין קרבה (למשל: בת, בן זוג)") };
  if (phone && !PHONE_OK.test(phone)) return { error: t("מספר הטלפון לא תקין") };
  if (email && !EMAIL_OK.test(email)) return { error: t("כתובת המייל לא תקינה") };
  if (!consent) return { error: t("יש לאשר שהמטופל הסכים לשתף את פרטי ההכנה") };

  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("id, full_name, clinic_id").eq("id", patientId).maybeSingle();
  if (!patient) return { error: t("המטופל לא נמצא") };

  const admin = createAdminClient();
  if (!admin) return { error: t("חסר SUPABASE_SERVICE_ROLE_KEY בהגדרות השרת") };

  const token = randomBytes(32).toString("base64url");
  const { error } = await admin.from("caregiver_invites").insert({
    clinic_id: patient.clinic_id,
    patient_id: patient.id,
    created_by: profile.id,
    invitee_name: name,
    relation,
    can_act: canAct,
    invitee_phone: phone || null,
    consent_confirmed_by_staff: true,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  if (error) return { error: t("יצירת ההזמנה נכשלה") };

  const url = `${await getOrigin()}/invite/${token}`;
  revalidatePath("/clinic", "layout");
  return { link: url, message: caregiverMessage(name, patient.full_name, await getClinicName(), url, await patientLang(patientId)), phone: phone || null, email: email || null, name };
}

export async function revokeInviteByStaff(inviteId: string): Promise<{ error?: string }> {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { data: invite } = await supabase.from("caregiver_invites").select("id").eq("id", inviteId).maybeSingle();
  if (!invite) return { error: t("ההזמנה לא נמצאה") };
  const admin = createAdminClient();
  if (!admin) return { error: t("חסר SUPABASE_SERVICE_ROLE_KEY בהגדרות השרת") };
  const { error } = await admin.from("caregiver_invites").delete().eq("id", inviteId);
  if (error) return { error: t("הביטול נכשל") };
  revalidatePath("/clinic", "layout");
  return {};
}

export async function scheduleTask(taskId: string, local: string, location: string) {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  if (local && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return { error: t("תאריך או שעה לא תקינים") };

  const { error } = await supabase
    .from("journey_tasks")
    .update({ scheduled_at: local ? israelLocalToIso(local) : null, location: location.trim() || null })
    .eq("id", taskId)
    .eq("kind", "appointment");
  if (error) return { error: t("השמירה נכשלה") };
  revalidatePath("/clinic", "layout");
  revalidatePath("/journey", "layout");
  return {};
}

export type DetailsState = { error?: string; ok?: boolean } | undefined;

// Staff and doctors can correct a patient's name and phone.
export async function updatePatientDetails(patientId: string, _: DetailsState, formData: FormData): Promise<DetailsState> {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!full_name || full_name.length > 80) return { error: t("יש להזין שם (עד 80 תווים)") };
  if (phone.length > 30 || !/^[0-9+\-\s()]*$/.test(phone)) return { error: t("מספר הטלפון לא תקין") };
  if (email && !EMAIL_OK.test(email)) return { error: t("כתובת המייל לא תקינה") };

  const supabase = await createClient();
  // RLS limits this to patients of the caller's clinic.
  const { data: patient } = await supabase.from("patients").select("id, user_id").eq("id", patientId).maybeSingle();
  if (!patient) return { error: t("המטופל לא נמצא") };

  const { error } = await supabase.from("patients").update({ full_name, phone: phone || null, email: email || null }).eq("id", patientId);
  if (error) return { error: t("השמירה נכשלה") };

  // Hospital and company come from the clinic's lists; a value the patient already has stays valid.
  if (formData.has("hospital") || formData.has("company")) {
    const hospital = String(formData.get("hospital") ?? "").trim();
    const company = String(formData.get("company") ?? "").trim();
    const [options, { data: current }] = await Promise.all([
      getClinicOptions(),
      supabase.from("patients").select("hospital, company").eq("id", patientId).maybeSingle(),
    ]);
    if (hospital && !options.hospitals.includes(hospital) && hospital !== current?.hospital) return { error: t("בית החולים שנבחר לא ברשימה") };
    if (company && !options.companies.includes(company) && company !== current?.company) return { error: t("החברה שנבחרה לא ברשימה") };
    const { error: optErr } = await supabase.from("patients").update({ hospital: hospital || null, company: company || null }).eq("id", patientId);
    if (optErr) return { error: t("שמירת בית החולים והחברה נכשלה. ודאו שהורצה התוספת supabase/patch-options.sql.") };
  }

  // Status (manual override) and language of the messages. Saved on their own, so the rest still works before
  // supabase/patch-lang-stage.sql has been run.
  if (formData.has("stage") || formData.has("lang")) {
    const stageRaw = String(formData.get("stage") ?? "");
    const langRaw = String(formData.get("lang") ?? "he");
    const patch: Record<string, string | null> = {};
    if (formData.has("stage")) patch.stage_override = (STAGES as readonly string[]).includes(stageRaw) ? stageRaw : null;
    if (formData.has("lang") && (["he", "en", "ru", "ar"] as const).some((l) => l === langRaw)) patch.lang = langRaw;
    const { error: extraErr } = await supabase.from("patients").update(patch).eq("id", patientId);
    if (extraErr) return { error: t("השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-lang-stage.sql.") };
  }

  // Keep the name shown in the patient's own greeting in sync.
  if (patient.user_id) {
    const admin = createAdminClient();
    if (admin) await admin.from("profiles").update({ full_name }).eq("id", patient.user_id);
  }
  revalidatePath("/clinic", "layout");
  revalidatePath("/journey", "layout");
  return { ok: true };
}

// Staff and doctors choose the language of the messages sent to a patient (the patient can also change it in the app).
export async function setPatientLang(patientId: string, lang: Lang): Promise<{ error?: string }> {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  if (!(["he", "en", "ru", "ar"] as const).includes(lang)) return { error: t("שפה לא תקינה") };
  const supabase = await createClient();
  const { error } = await supabase.from("patients").update({ lang }).eq("id", patientId);
  if (error) return { error: t("השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-lang-stage.sql.") };
  revalidatePath("/clinic", "layout");
  return {};
}

// Staff and doctors can set the patient's status by hand. null goes back to the automatic status.
export async function setPatientStage(patientId: string, stage: Stage | null): Promise<{ error?: string }> {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  if (stage !== null && !STAGES.includes(stage)) return { error: t("סטטוס לא תקין") };
  const supabase = await createClient();
  const { error } = await supabase.from("patients").update({ stage_override: stage }).eq("id", patientId);
  if (error) return { error: t("השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-lang-stage.sql.") };
  revalidatePath("/clinic", "layout");
  return {};
}

export const CANCEL_REASONS = ["patient_request", "medical", "insurance", "clinic_schedule", "other"] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

export async function cancelJourney(journeyId: string, reason: CancelReason) {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  if (!CANCEL_REASONS.includes(reason)) return { error: t("סיבה לא תקינה") };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_journey", { p_journey: journeyId, p_reason: reason });
  if (error) return { error: t("שמירת הביטול נכשלה. ודאו שהורצה התוספת supabase/patch-outcomes.sql.") };
  revalidatePath("/clinic", "layout");
  return {};
}

export async function uncancelJourney(journeyId: string) {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("uncancel_journey", { p_journey: journeyId });
  if (error) return { error: t("השמירה נכשלה") };
  revalidatePath("/clinic", "layout");
  return {};
}
