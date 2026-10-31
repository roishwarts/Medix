"use server";

import { getT } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function saveTemplatePatientInfo(templateId: string, patientInfo: string): Promise<{ error?: string }> {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_template_patient_info", { p_template: templateId, p_patient_info: patientInfo });
  if (error) return { error: t("השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-patient-content.sql.") };
  revalidatePath("/clinic/content");
  return {};
}

export async function saveTemplateRedFlags(templateId: string, redFlags: string): Promise<{ error?: string }> {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_template_red_flags", { p_template: templateId, p_red_flags: redFlags });
  if (error) return { error: t("השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-red-flags.sql.") };
  revalidatePath("/clinic/content");
  revalidatePath("/journey");
  return {};
}

export async function addClinicLink(label: string, url: string): Promise<{ error?: string }> {
  const t = await getT();
  const profile = await requireProfile(["staff", "doctor"]);
  const l = label.trim();
  let u = url.trim();
  if (!l) return { error: t("יש להזין שם לקישור") };
  if (!u) return { error: t("יש להזין כתובת") };
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    new URL(u);
  } catch {
    return { error: t("הכתובת אינה תקינה") };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("clinic_links").insert({ clinic_id: profile.clinic_id, label: l, url: u });
  if (error) return { error: t("ההוספה נכשלה. ודאו שהורצה התוספת supabase/patch-patient-content.sql.") };
  revalidatePath("/clinic/content");
  revalidatePath("/journey");
  return {};
}

export async function removeClinicLink(id: string): Promise<{ error?: string }> {
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  await supabase.from("clinic_links").delete().eq("id", id);
  revalidatePath("/clinic/content");
  revalidatePath("/journey");
  return {};
}

export async function addClinicVideo(title: string, phase: "before" | "after", storagePath: string): Promise<{ error?: string }> {
  const profile = await requireProfile(["staff", "doctor"]);
  const t = await getT();
  const name = title.trim();
  if (!name) return { error: t("יש להזין שם לסרטון") };
  const supabase = await createClient();
  const { error } = await supabase.from("clinic_videos").insert({ clinic_id: profile.clinic_id, title: name, phase, storage_path: storagePath });
  if (error) {
    await supabase.storage.from("clinic-videos").remove([storagePath]);
    return { error: t("השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-patient-content.sql.") };
  }
  revalidatePath("/clinic/content");
  revalidatePath("/journey");
  return {};
}

export async function saveClinicContact(
  name: string,
  role: string,
  phone: string,
  emergencyPhone: string,
  officeHours: string,
): Promise<{ error?: string }> {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_clinic_contact_info", {
    p_contact_name: name,
    p_contact_role: role,
    p_contact_phone: phone,
    p_emergency_phone: emergencyPhone,
    p_office_hours: officeHours,
  });
  if (error) return { error: t("השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-contact-info.sql.") };
  revalidatePath("/clinic/content");
  revalidatePath("/journey");
  return {};
}

export async function saveClinicLogo(path: string): Promise<{ error?: string }> {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_clinic_logo", { p_path: path });
  if (error) return { error: t("השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-clinic-logo.sql.") };
  revalidatePath("/clinic/content");
  revalidatePath("/clinic", "layout");
  revalidatePath("/journey", "layout");
  return {};
}

export async function removeClinicLogo(): Promise<{ error?: string }> {
  const t = await getT();
  const profile = await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  await supabase.storage.from("clinic-logos").remove([`${profile.clinic_id}/logo`]);
  const { error } = await supabase.rpc("save_clinic_logo", { p_path: "" });
  if (error) return { error: t("ההסרה נכשלה.") };
  revalidatePath("/clinic/content");
  revalidatePath("/clinic", "layout");
  revalidatePath("/journey", "layout");
  return {};
}

export async function saveClinicBrandColor(color: string): Promise<{ error?: string }> {
  const t = await getT();
  await requireProfile(["staff", "doctor"]);
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) return { error: t("צבע לא תקין") };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_clinic_brand_color", { p_color: color });
  if (error) return { error: t("השמירה נכשלה. ודאו שהורצה התוספת supabase/patch-brand-color.sql.") };
  revalidatePath("/clinic/content");
  revalidatePath("/clinic", "layout");
  revalidatePath("/journey", "layout");
  return {};
}

export async function removeClinicVideo(id: string): Promise<{ error?: string }> {
  await requireProfile(["staff", "doctor"]);
  const supabase = await createClient();
  const { data } = await supabase.from("clinic_videos").select("storage_path").eq("id", id).maybeSingle();
  await supabase.from("clinic_videos").delete().eq("id", id);
  if (data?.storage_path) await supabase.storage.from("clinic-videos").remove([data.storage_path]);
  revalidatePath("/clinic/content");
  revalidatePath("/journey");
  return {};
}
